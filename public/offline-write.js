(() => {
  "use strict";

  const STORE_BY_ENTITY = {
    manager_property: "managerProperties",
    manager_tenant: "managerTenants",
    manager_maintenance_request:
      "managerMaintenanceRequests",
    developer_estate: "developerEstates",
    developer_buyer: "developerBuyers",
  };

  const COLLECTION_BY_ENTITY = {
    manager_property: "managerProperties",
    manager_tenant: "managerTenants",
    manager_maintenance_request:
      "managerMaintenance",
    developer_estate: "developerEstates",
    developer_buyer: "developerBuyers",
  };

  const DRAFT_PREFIX = "offline-safe-edit";
  let modalElement = null;
  let toastTimer = null;
  let draftTimer = null;

  function scope() {
    return {
      ownerProfileId:
        state.workspace.ownerProfileId,
      workspaceType:
        state.workspace.workspaceType,
      workspaceId:
        state.workspace.workspaceId,
    };
  }

  function workspaceKey() {
    const current = scope();

    return [
      current.ownerProfileId,
      current.workspaceType,
      current.workspaceId,
    ].join("::");
  }

  function entityKey(entityType, entityId) {
    return [
      workspaceKey(),
      entityType,
      entityId,
    ].join("::");
  }

  function draftKey(draftType, draftId) {
    return [
      workspaceKey(),
      draftType,
      draftId,
    ].join("::");
  }

  function requestPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () =>
        resolve(request.result);
      request.onerror = () =>
        reject(request.error);
    });
  }

  function transactionPromise(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error);
      transaction.onabort = () =>
        reject(transaction.error);
    });
  }

  async function allRows(storeName) {
    const db = await openDatabase();

    if (
      !db.objectStoreNames.contains(storeName)
    ) {
      return [];
    }

    const transaction = db.transaction(
      storeName,
      "readonly",
    );

    return requestPromise(
      transaction
        .objectStore(storeName)
        .getAll(),
    );
  }

  async function saveDraft(
    draftType,
    draftId,
    data,
  ) {
    const db = await openDatabase();
    const transaction = db.transaction(
      "drafts",
      "readwrite",
    );
    const store =
      transaction.objectStore("drafts");
    const localKey = draftKey(
      draftType,
      draftId,
    );
    const current = await requestPromise(
      store.get(localKey),
    );
    const now = new Date().toISOString();

    store.put({
      localKey,
      ...scope(),
      draftType,
      draftId,
      data,
      createdAt:
        current?.createdAt || now,
      updatedAt: now,
    });

    await transactionPromise(transaction);
  }

  async function loadDraft(
    draftType,
    draftId,
  ) {
    const db = await openDatabase();
    const transaction = db.transaction(
      "drafts",
      "readonly",
    );

    return requestPromise(
      transaction
        .objectStore("drafts")
        .get(
          draftKey(draftType, draftId),
        ),
    );
  }

  async function removeDraft(
    draftType,
    draftId,
  ) {
    const db = await openDatabase();
    const transaction = db.transaction(
      "drafts",
      "readwrite",
    );

    transaction
      .objectStore("drafts")
      .delete(
        draftKey(draftType, draftId),
      );

    await transactionPromise(transaction);
  }

  function localRecord(
    entityType,
    entityId,
  ) {
    const collection =
      COLLECTION_BY_ENTITY[entityType];
    const records =
      state.records[collection] || [];

    return (
      records.find(
        (record) =>
          record.entityId === entityId,
      ) || null
    );
  }

  function putStateRecord(record) {
    const collection =
      COLLECTION_BY_ENTITY[
        record.entityType
      ];
    const records =
      state.records[collection] || [];

    state.records[collection] = [
      record,
      ...records.filter(
        (item) =>
          item.entityId !==
          record.entityId,
      ),
    ];
  }

  async function queueMutation({
    entityType,
    entityId,
    operation,
    baseRevision,
    payload,
    localData,
    clientMutationId = null,
  }) {
    const storeName =
      STORE_BY_ENTITY[entityType];

    if (!storeName) {
      throw new Error(
        "This record cannot be changed offline.",
      );
    }

    const db = await openDatabase();
    const transaction = db.transaction(
      [storeName, "outbox"],
      "readwrite",
    );
    const entityStore =
      transaction.objectStore(storeName);
    const outboxStore =
      transaction.objectStore("outbox");
    const outbox = await requestPromise(
      outboxStore.getAll(),
    );
    const currentScope = scope();
    const existing = outbox.find(
      (mutation) =>
        mutation.ownerProfileId ===
          currentScope.ownerProfileId &&
        mutation.workspaceId ===
          currentScope.workspaceId &&
        mutation.entityType ===
          entityType &&
        mutation.entityId === entityId &&
        mutation.status !== "processing",
    );
    const now = new Date().toISOString();
    const currentLocal =
      await requestPromise(
        entityStore.get(
          entityKey(
            entityType,
            entityId,
          ),
        ),
      );
    const effectiveOperation =
      existing?.operation === "create"
        ? "create"
        : operation;
    const effectivePayload =
      effectiveOperation === "create" &&
      existing
        ? {
            ...existing.payload,
            ...payload,
          }
        : payload;
    const mutationId =
      existing?.clientMutationId ||
      clientMutationId ||
      crypto.randomUUID();

    outboxStore.put({
      clientMutationId: mutationId,
      ...currentScope,
      entityType,
      entityId,
      operation: effectiveOperation,
      baseRevision:
        existing?.baseRevision ??
        baseRevision,
      payload: effectivePayload,
      status: "waiting",
      attemptCount:
        existing?.attemptCount ?? 0,
      nextAttemptAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt:
        existing?.createdAt ?? now,
      updatedAt: now,
    });

    const record = {
      localKey: entityKey(
        entityType,
        entityId,
      ),
      ...currentScope,
      entityType,
      entityId,
      serverRevision:
        currentLocal?.serverRevision ??
        baseRevision ??
        0,
      serverUpdatedAt:
        currentLocal?.serverUpdatedAt ??
        null,
      localUpdatedAt: now,
      deletedAt: null,
      data: {
        ...(currentLocal?.data || {}),
        ...localData,
        updated_at: now,
      },
    };

    entityStore.put(record);

    await transactionPromise(transaction);
    putStateRecord(record);
    await refreshStatus();

    return record;
  }

  function showToast(message) {
    document
      .querySelector(".offline-toast")
      ?.remove();

    const toast =
      document.createElement("div");

    toast.className = "offline-toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.appendChild(toast);

    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(
      () => toast.remove(),
      4500,
    );
  }

  function closeModal() {
    if (draftTimer) {
      clearTimeout(draftTimer);
      draftTimer = null;
    }

    modalElement?.remove();
    modalElement = null;
  }

  function openModal(title, copy, body) {
    closeModal();

    modalElement =
      document.createElement("div");
    modalElement.className =
      "offline-modal-backdrop";
    modalElement.innerHTML = `
      <section
        class="offline-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offline-modal-title"
      >
        <header class="offline-modal-head">
          <div>
            <h2
              class="offline-modal-title"
              id="offline-modal-title"
            >
              ${escapeHtml(title)}
            </h2>
            <p class="offline-modal-copy">
              ${escapeHtml(copy)}
            </p>
          </div>
          <button
            type="button"
            class="offline-close"
            aria-label="Close"
            data-close-offline-modal
          >
            ×
          </button>
        </header>
        ${body}
      </section>
    `;

    modalElement.addEventListener(
      "click",
      (event) => {
        if (
          event.target === modalElement ||
          event.target.closest(
            "[data-close-offline-modal]",
          )
        ) {
          closeModal();
        }
      },
    );

    document.body.appendChild(
      modalElement,
    );

    return modalElement;
  }

  function inputField(
    label,
    name,
    value = "",
    options = {},
  ) {
    const {
      type = "text",
      required = false,
      full = false,
      help = "",
    } = options;

    return `
      <label class="offline-field ${full ? "full" : ""}">
        <span class="offline-label">
          ${escapeHtml(label)}
        </span>
        <input
          class="offline-input"
          type="${escapeHtml(type)}"
          name="${escapeHtml(name)}"
          value="${escapeHtml(value ?? "")}"
          ${required ? "required" : ""}
        />
        ${
          help
            ? `<span class="offline-help">${escapeHtml(help)}</span>`
            : ""
        }
      </label>
    `;
  }

  function textAreaField(
    label,
    name,
    value = "",
  ) {
    return `
      <label class="offline-field full">
        <span class="offline-label">
          ${escapeHtml(label)}
        </span>
        <textarea
          class="offline-textarea"
          name="${escapeHtml(name)}"
        >${escapeHtml(value ?? "")}</textarea>
      </label>
    `;
  }

  function selectField(
    label,
    name,
    value,
    options,
    full = false,
  ) {
    return `
      <label class="offline-field ${full ? "full" : ""}">
        <span class="offline-label">
          ${escapeHtml(label)}
        </span>
        <select
          class="offline-select"
          name="${escapeHtml(name)}"
        >
          ${options
            .map(
              ([optionValue, optionLabel]) => `
                <option
                  value="${escapeHtml(optionValue)}"
                  ${
                    String(value ?? "") ===
                    String(optionValue)
                      ? "selected"
                      : ""
                  }
                >
                  ${escapeHtml(optionLabel)}
                </option>
              `,
            )
            .join("")}
        </select>
      </label>
    `;
  }

  function formShell(fields) {
    return `
      <form class="offline-form">
        <div
          class="offline-form-error"
          hidden
        ></div>
        <div class="offline-grid">
          ${fields}
        </div>
        <div class="offline-form-actions">
          <button
            class="offline-action secondary"
            type="button"
            data-close-offline-modal
          >
            Cancel
          </button>
          <button
            class="offline-action"
            type="submit"
          >
            Save on this device
          </button>
        </div>
      </form>
    `;
  }

  function value(form, name) {
    return String(
      new FormData(form).get(name) || "",
    ).trim();
  }

  function nullableValue(form, name) {
    return value(form, name) || null;
  }

  function numberValue(form, name) {
    const parsed = Number(
      value(form, name).replaceAll(
        ",",
        "",
      ),
    );

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  function showFormError(form, message) {
    const error =
      form.querySelector(
        ".offline-form-error",
      );

    error.textContent = message;
    error.hidden = false;
  }

  function formSnapshot(form) {
    return Object.fromEntries(
      new FormData(form).entries(),
    );
  }

  async function restoreDraft(
    form,
    draftType,
    draftId,
  ) {
    const draft = await loadDraft(
      draftType,
      draftId,
    );

    if (!draft?.data) {
      return;
    }

    for (const [
      name,
      savedValue,
    ] of Object.entries(draft.data)) {
      const control =
        form.elements.namedItem(name);

      if (
        control &&
        "value" in control
      ) {
        control.value = String(
          savedValue ?? "",
        );
      }
    }
  }

  function autosaveDraft(
    form,
    draftType,
    draftId,
  ) {
    form.addEventListener("input", () => {
      if (draftTimer) {
        clearTimeout(draftTimer);
      }

      draftTimer = setTimeout(() => {
        void saveDraft(
          draftType,
          draftId,
          formSnapshot(form),
        );
      }, 350);
    });
  }

  async function editProperty(record) {
    const data = record.data;
    const draftType =
      `${DRAFT_PREFIX}:manager-property`;
    const draftId = record.entityId;
    const modal = openModal(
      "Edit property details",
      "These descriptive details can be saved offline. Payment setup and charges remain online-only.",
      formShell(
        [
          inputField(
            "Property name",
            "propertyName",
            data.property_name,
            {
              required: true,
              full: true,
            },
          ),
          inputField(
            "Property address",
            "propertyAddress",
            data.property_address,
            {
              required: true,
              full: true,
            },
          ),
          inputField(
            "City / town",
            "city",
            data.city,
          ),
          textAreaField(
            "Internal note",
            "notes",
            data.notes,
          ),
        ].join(""),
      ),
    );
    const form =
      modal.querySelector("form");

    await restoreDraft(
      form,
      draftType,
      draftId,
    );
    autosaveDraft(
      form,
      draftType,
      draftId,
    );

    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const propertyName = value(
          form,
          "propertyName",
        );
        const propertyAddress = value(
          form,
          "propertyAddress",
        );

        if (
          propertyName.length < 2 ||
          propertyAddress.length < 3
        ) {
          showFormError(
            form,
            "Enter the property name and address.",
          );
          return;
        }

        const payload = {
          propertyName,
          propertyAddress,
          city:
            nullableValue(form, "city"),
          notes:
            nullableValue(form, "notes"),
        };

        await queueMutation({
          entityType:
            "manager_property",
          entityId: record.entityId,
          operation: "update",
          baseRevision:
            record.serverRevision,
          payload,
          localData: {
            property_name:
              payload.propertyName,
            property_address:
              payload.propertyAddress,
            city: payload.city,
            notes: payload.notes,
          },
        });

        await removeDraft(
          draftType,
          draftId,
        );
        closeModal();
        renderWorkspace();
        showToast(
          "Property details saved. They will sync automatically when you reconnect.",
        );
      },
    );
  }

  async function editTenant(record) {
    const data = record.data;
    const draftType =
      `${DRAFT_PREFIX}:manager-tenant`;
    const draftId = record.entityId;
    const modal = openModal(
      "Edit tenant contact details",
      "Rent, balance, tenancy dates, and tenant status remain online-only.",
      formShell(
        [
          inputField(
            "Full name",
            "fullName",
            data.full_name,
            {
              required: true,
              full: true,
            },
          ),
          inputField(
            "Phone number",
            "phoneNumber",
            data.phone_number,
            {
              type: "tel",
              required: true,
            },
          ),
          inputField(
            "Email",
            "email",
            data.email,
            {
              type: "email",
            },
          ),
          inputField(
            "Occupation",
            "occupation",
            data.occupation,
            {
              full: true,
            },
          ),
          textAreaField(
            "Internal note",
            "notes",
            data.notes,
          ),
        ].join(""),
      ),
    );
    const form =
      modal.querySelector("form");

    await restoreDraft(
      form,
      draftType,
      draftId,
    );
    autosaveDraft(
      form,
      draftType,
      draftId,
    );

    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const fullName = value(
          form,
          "fullName",
        );
        const phoneNumber = value(
          form,
          "phoneNumber",
        );

        if (
          fullName.length < 2 ||
          phoneNumber.length < 7
        ) {
          showFormError(
            form,
            "Enter the tenant's name and phone number.",
          );
          return;
        }

        const payload = {
          fullName,
          phoneNumber,
          email:
            nullableValue(form, "email"),
          occupation:
            nullableValue(
              form,
              "occupation",
            ),
          notes:
            nullableValue(form, "notes"),
        };

        await queueMutation({
          entityType:
            "manager_tenant",
          entityId: record.entityId,
          operation: "update",
          baseRevision:
            record.serverRevision,
          payload,
          localData: {
            full_name:
              payload.fullName,
            phone_number:
              payload.phoneNumber,
            email: payload.email,
            occupation:
              payload.occupation,
            notes: payload.notes,
          },
        });

        await removeDraft(
          draftType,
          draftId,
        );
        closeModal();
        renderWorkspace();
        showToast(
          "Tenant contact details saved. They will sync automatically when you reconnect.",
        );
      },
    );
  }

  async function editEstate(record) {
    const data = record.data;
    const draftType =
      `${DRAFT_PREFIX}:developer-estate`;
    const draftId = record.entityId;
    const modal = openModal(
      "Edit estate details",
      "Land size, plot inventory, pricing, payment terms, and estate status remain online-only.",
      formShell(
        [
          inputField(
            "Estate name",
            "estateName",
            data.estate_name,
            {
              required: true,
              full: true,
            },
          ),
          inputField(
            "Location",
            "location",
            data.location,
            {
              required: true,
              full: true,
            },
          ),
          inputField(
            "City / town",
            "city",
            data.city,
          ),
          textAreaField(
            "Description",
            "description",
            data.description,
          ),
        ].join(""),
      ),
    );
    const form =
      modal.querySelector("form");

    await restoreDraft(
      form,
      draftType,
      draftId,
    );
    autosaveDraft(
      form,
      draftType,
      draftId,
    );

    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const estateName = value(
          form,
          "estateName",
        );
        const location = value(
          form,
          "location",
        );

        if (
          estateName.length < 2 ||
          location.length < 2
        ) {
          showFormError(
            form,
            "Enter the estate name and location.",
          );
          return;
        }

        const payload = {
          estateName,
          location,
          city:
            nullableValue(form, "city"),
          description:
            nullableValue(
              form,
              "description",
            ),
        };

        await queueMutation({
          entityType:
            "developer_estate",
          entityId: record.entityId,
          operation: "update",
          baseRevision:
            record.serverRevision,
          payload,
          localData: {
            estate_name:
              payload.estateName,
            location:
              payload.location,
            city: payload.city,
            description:
              payload.description,
          },
        });

        await removeDraft(
          draftType,
          draftId,
        );
        closeModal();
        renderWorkspace();
        showToast(
          "Estate details saved. They will sync automatically when you reconnect.",
        );
      },
    );
  }

  async function editBuyer(record) {
    const data = record.data;
    const draftType =
      `${DRAFT_PREFIX}:developer-buyer`;
    const draftId = record.entityId;
    const modal = openModal(
      "Edit buyer contact details",
      "Identity details, allocation, payments, and buyer status remain online-only.",
      formShell(
        [
          inputField(
            "Full name",
            "fullName",
            data.full_name,
            {
              required: true,
              full: true,
            },
          ),
          inputField(
            "Phone number",
            "phoneNumber",
            data.phone_number,
            {
              type: "tel",
              required: true,
            },
          ),
          inputField(
            "Email",
            "email",
            data.email,
            {
              type: "email",
            },
          ),
        ].join(""),
      ),
    );
    const form =
      modal.querySelector("form");

    await restoreDraft(
      form,
      draftType,
      draftId,
    );
    autosaveDraft(
      form,
      draftType,
      draftId,
    );

    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const fullName = value(
          form,
          "fullName",
        );
        const phoneNumber = value(
          form,
          "phoneNumber",
        );

        if (
          fullName.length < 2 ||
          phoneNumber.length < 7
        ) {
          showFormError(
            form,
            "Enter the buyer's name and phone number.",
          );
          return;
        }

        const payload = {
          fullName,
          phoneNumber,
          email:
            nullableValue(form, "email"),
        };

        await queueMutation({
          entityType:
            "developer_buyer",
          entityId: record.entityId,
          operation: "update",
          baseRevision:
            record.serverRevision,
          payload,
          localData: {
            full_name:
              payload.fullName,
            phone_number:
              payload.phoneNumber,
            email: payload.email,
          },
        });

        await removeDraft(
          draftType,
          draftId,
        );
        closeModal();
        renderWorkspace();
        showToast(
          "Buyer contact details saved. They will sync automatically when you reconnect.",
        );
      },
    );
  }

  function currentManagerRecords() {
    return {
      properties: (
        state.records.managerProperties || []
      ).filter(
        (record) =>
          normalize(
            record.data.status,
          ) !== "archived",
      ),
      units: (
        state.records.managerUnits || []
      ).filter(
        (record) =>
          normalize(
            record.data.status,
          ) !== "inactive",
      ),
      tenants: (
        state.records.managerTenants || []
      ).filter((record) =>
        MANAGER_CURRENT_TENANT_STATUSES.has(
          normalize(record.data.status),
        ),
      ),
    };
  }

  async function createMaintenance() {
    const {
      properties,
      units,
      tenants,
    } = currentManagerRecords();

    if (properties.length === 0) {
      showToast(
        "Reconnect and add a property before recording maintenance.",
      );
      return;
    }

    const draftType =
      `${DRAFT_PREFIX}:manager-maintenance-create`;
    const draftId = "new";
    const propertyOptions =
      properties.map((record) => [
        record.entityId,
        record.data.property_name,
      ]);
    const modal = openModal(
      "Record maintenance issue",
      "The issue is saved on this device and sent automatically when the connection returns.",
      formShell(
        [
          selectField(
            "Property",
            "propertyId",
            propertyOptions[0]?.[0],
            propertyOptions,
            true,
          ),
          selectField(
            "Unit",
            "unitId",
            "",
            [
              [
                "",
                "Property-wide issue",
              ],
            ],
          ),
          selectField(
            "Tenant",
            "tenantId",
            "",
            [
              [
                "",
                "No tenant linked",
              ],
            ],
          ),
          inputField(
            "Issue",
            "issueTitle",
            "",
            {
              required: true,
              full: true,
            },
          ),
          textAreaField(
            "Description",
            "issueDescription",
          ),
          inputField(
            "Expected amount",
            "estimatedCost",
            "",
            {
              type: "number",
              required: true,
              help:
                "Use the estimated repair amount.",
            },
          ),
          selectField(
            "Priority",
            "priority",
            "medium",
            [
              ["low", "Low"],
              ["medium", "Medium"],
              ["high", "High"],
              ["urgent", "Urgent"],
            ],
          ),
          inputField(
            "Reported date",
            "reportedDate",
            new Date()
              .toISOString()
              .slice(0, 10),
            {
              type: "date",
              required: true,
            },
          ),
          inputField(
            "Vendor",
            "vendorName",
          ),
          textAreaField(
            "Internal note",
            "notes",
          ),
        ].join(""),
      ),
    );
    const form =
      modal.querySelector("form");
    const propertySelect =
      form.elements.namedItem(
        "propertyId",
      );
    const unitSelect =
      form.elements.namedItem("unitId");
    const tenantSelect =
      form.elements.namedItem(
        "tenantId",
      );

    function refreshLinkedOptions() {
      const propertyId =
        propertySelect.value;
      const selectedUnitId =
        unitSelect.value;
      const selectedTenantId =
        tenantSelect.value;
      const matchingUnits =
        units.filter(
          (record) =>
            record.data.property_id ===
            propertyId,
        );
      const matchingTenants =
        tenants.filter(
          (record) =>
            record.data.property_id ===
              propertyId &&
            (
              !selectedUnitId ||
              record.data.unit_id ===
                selectedUnitId
            ),
        );

      unitSelect.innerHTML = [
        `<option value="">Property-wide issue</option>`,
        ...matchingUnits.map(
          (record) => `
            <option
              value="${escapeHtml(record.entityId)}"
              ${
                selectedUnitId ===
                record.entityId
                  ? "selected"
                  : ""
              }
            >
              ${escapeHtml(record.data.unit_label)}
            </option>
          `,
        ),
      ].join("");

      tenantSelect.innerHTML = [
        `<option value="">No tenant linked</option>`,
        ...matchingTenants.map(
          (record) => `
            <option
              value="${escapeHtml(record.entityId)}"
              ${
                selectedTenantId ===
                record.entityId
                  ? "selected"
                  : ""
              }
            >
              ${escapeHtml(record.data.full_name)}
            </option>
          `,
        ),
      ].join("");
    }

    propertySelect.addEventListener(
      "change",
      () => {
        unitSelect.value = "";
        tenantSelect.value = "";
        refreshLinkedOptions();
      },
    );
    unitSelect.addEventListener(
      "change",
      () => {
        tenantSelect.value = "";
        refreshLinkedOptions();
      },
    );

    await restoreDraft(
      form,
      draftType,
      draftId,
    );
    refreshLinkedOptions();
    autosaveDraft(
      form,
      draftType,
      draftId,
    );

    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const propertyId = value(
          form,
          "propertyId",
        );
        const property =
          properties.find(
            (record) =>
              record.entityId ===
              propertyId,
          );
        const issueTitle = value(
          form,
          "issueTitle",
        );
        const estimatedCost =
          numberValue(
            form,
            "estimatedCost",
          );

        if (
          !property ||
          issueTitle.length < 2 ||
          estimatedCost <= 0
        ) {
          showFormError(
            form,
            "Select a property, enter the issue, and add an expected amount.",
          );
          return;
        }

        const unitId =
          nullableValue(form, "unitId");
        const tenantId =
          nullableValue(
            form,
            "tenantId",
          );

        if (tenantId && !unitId) {
          showFormError(
            form,
            "Select the tenant's unit first.",
          );
          return;
        }

        const entityId =
          crypto.randomUUID();
        const now =
          new Date().toISOString();
        const payload = {
          landlordClientId:
            property.data
              .landlord_client_id,
          propertyId,
          unitId,
          tenantId,
          issueTitle,
          issueDescription:
            nullableValue(
              form,
              "issueDescription",
            ),
          priority:
            value(form, "priority"),
          estimatedCost,
          vendorName:
            nullableValue(
              form,
              "vendorName",
            ),
          reportedDate:
            value(form, "reportedDate"),
          notes:
            nullableValue(form, "notes"),
        };

        await queueMutation({
          entityType:
            "manager_maintenance_request",
          entityId,
          operation: "create",
          baseRevision: null,
          payload,
          localData: {
            id: entityId,
            organization_id:
              state.workspace.workspaceId,
            landlord_client_id:
              payload.landlordClientId,
            property_id:
              payload.propertyId,
            unit_id: payload.unitId,
            tenant_id: payload.tenantId,
            issue_title:
              payload.issueTitle,
            issue_description:
              payload.issueDescription,
            priority:
              payload.priority,
            status: "reported",
            estimated_cost:
              payload.estimatedCost,
            actual_cost: 0,
            vendor_name:
              payload.vendorName,
            reported_date:
              payload.reportedDate,
            resolved_date: null,
            notes: payload.notes,
            created_at: now,
          },
        });

        await removeDraft(
          draftType,
          draftId,
        );
        closeModal();
        state.activeTab = "activity";
        renderWorkspace();
        showToast(
          "Maintenance issue saved. It will sync automatically when you reconnect.",
        );
      },
    );
  }

  async function editMaintenance(record) {
    const data = record.data;
    const draftType =
      `${DRAFT_PREFIX}:manager-maintenance`;
    const draftId = record.entityId;
    const modal = openModal(
      "Update maintenance issue",
      "Payment records and actual spending cannot be changed offline.",
      formShell(
        [
          inputField(
            "Issue",
            "issueTitle",
            data.issue_title,
            {
              required: true,
              full: true,
            },
          ),
          textAreaField(
            "Description",
            "issueDescription",
            data.issue_description,
          ),
          inputField(
            "Expected amount",
            "estimatedCost",
            data.estimated_cost,
            {
              type: "number",
              required: true,
            },
          ),
          selectField(
            "Priority",
            "priority",
            data.priority,
            [
              ["low", "Low"],
              ["medium", "Medium"],
              ["high", "High"],
              ["urgent", "Urgent"],
            ],
          ),
          selectField(
            "Status",
            "status",
            data.status,
            [
              ["reported", "Reported"],
              [
                "in_progress",
                "In progress",
              ],
              ["resolved", "Resolved"],
              ["cancelled", "Cancelled"],
            ],
          ),
          inputField(
            "Reported date",
            "reportedDate",
            data.reported_date,
            {
              type: "date",
              required: true,
            },
          ),
          inputField(
            "Resolved date",
            "resolvedDate",
            data.resolved_date,
            {
              type: "date",
            },
          ),
          inputField(
            "Vendor",
            "vendorName",
            data.vendor_name,
          ),
          textAreaField(
            "Internal note",
            "notes",
            data.notes,
          ),
        ].join(""),
      ),
    );
    const form =
      modal.querySelector("form");

    await restoreDraft(
      form,
      draftType,
      draftId,
    );
    autosaveDraft(
      form,
      draftType,
      draftId,
    );

    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const issueTitle = value(
          form,
          "issueTitle",
        );
        const estimatedCost =
          numberValue(
            form,
            "estimatedCost",
          );
        const status =
          value(form, "status");
        const reportedDate = value(
          form,
          "reportedDate",
        );
        const resolvedDate =
          nullableValue(
            form,
            "resolvedDate",
          );

        if (
          issueTitle.length < 2 ||
          estimatedCost <= 0 ||
          !reportedDate
        ) {
          showFormError(
            form,
            "Enter the issue, expected amount, and reported date.",
          );
          return;
        }

        if (
          status === "resolved" &&
          !resolvedDate
        ) {
          showFormError(
            form,
            "Set a resolved date when the issue is resolved.",
          );
          return;
        }

        if (
          resolvedDate &&
          resolvedDate < reportedDate
        ) {
          showFormError(
            form,
            "Resolved date cannot be before reported date.",
          );
          return;
        }

        const payload = {
          issueTitle,
          issueDescription:
            nullableValue(
              form,
              "issueDescription",
            ),
          priority:
            value(form, "priority"),
          status,
          estimatedCost,
          vendorName:
            nullableValue(
              form,
              "vendorName",
            ),
          reportedDate,
          resolvedDate,
          notes:
            nullableValue(form, "notes"),
        };

        await queueMutation({
          entityType:
            "manager_maintenance_request",
          entityId: record.entityId,
          operation: "update",
          baseRevision:
            record.serverRevision,
          payload,
          localData: {
            issue_title:
              payload.issueTitle,
            issue_description:
              payload.issueDescription,
            priority:
              payload.priority,
            status: payload.status,
            estimated_cost:
              payload.estimatedCost,
            vendor_name:
              payload.vendorName,
            reported_date:
              payload.reportedDate,
            resolved_date:
              payload.resolvedDate,
            notes: payload.notes,
          },
        });

        await removeDraft(
          draftType,
          draftId,
        );
        closeModal();
        renderWorkspace();
        showToast(
          "Maintenance details saved. They will sync automatically when you reconnect.",
        );
      },
    );
  }

  function payloadToLocalData(
    entityType,
    payload,
  ) {
    switch (entityType) {
      case "manager_property":
        return {
          property_name:
            payload.propertyName,
          property_address:
            payload.propertyAddress,
          city: payload.city,
          notes: payload.notes,
        };

      case "manager_tenant":
        return {
          full_name: payload.fullName,
          phone_number:
            payload.phoneNumber,
          email: payload.email,
          occupation:
            payload.occupation,
          notes: payload.notes,
        };

      case "manager_maintenance_request":
        return {
          issue_title:
            payload.issueTitle,
          issue_description:
            payload.issueDescription,
          priority: payload.priority,
          status:
            payload.status ||
            "reported",
          estimated_cost:
            payload.estimatedCost,
          vendor_name:
            payload.vendorName,
          reported_date:
            payload.reportedDate,
          resolved_date:
            payload.resolvedDate ||
            null,
          notes: payload.notes,
        };

      case "developer_estate":
        return {
          estate_name:
            payload.estateName,
          location: payload.location,
          city: payload.city,
          description:
            payload.description,
        };

      case "developer_buyer":
        return {
          full_name: payload.fullName,
          phone_number:
            payload.phoneNumber,
          email: payload.email,
        };

      default:
        return {};
    }
  }

  async function refreshStatus() {
    if (!state.workspace) {
      return;
    }

    const [
      outbox,
      conflicts,
    ] = await Promise.all([
      allRows("outbox"),
      allRows("conflicts"),
    ]);
    const current = scope();
    const pending = outbox.filter(
      (item) =>
        item.ownerProfileId ===
          current.ownerProfileId &&
        item.workspaceId ===
          current.workspaceId,
    );
    const review = conflicts.filter(
      (item) =>
        item.ownerProfileId ===
          current.ownerProfileId &&
        item.workspaceId ===
          current.workspaceId &&
        item.status === "unresolved",
    );
    const status =
      document.getElementById(
        "local-change-status",
      );

    if (!status) {
      return;
    }

    status.className = "local-status";

    if (review.length > 0) {
      status.classList.add(
        "attention",
      );
      status.innerHTML = `
        <span class="local-status-dot"></span>
        ${review.length}
        ${review.length === 1 ? "record" : "records"}
        need review
      `;
      return;
    }

    if (pending.length > 0) {
      status.classList.add("waiting");
      status.innerHTML = `
        <span class="local-status-dot"></span>
        ${pending.length}
        ${pending.length === 1 ? "change" : "changes"}
        waiting
      `;
      return;
    }

    status.innerHTML = `
      <span class="local-status-dot"></span>
      Offline copy ready
    `;
  }

  async function resolveConflict(
    conflictId,
  ) {
    const db = await openDatabase();
    const transaction = db.transaction(
      "conflicts",
      "readwrite",
    );
    const store =
      transaction.objectStore("conflicts");
    const conflict =
      await requestPromise(
        store.get(conflictId),
      );

    if (conflict) {
      store.put({
        ...conflict,
        status: "resolved",
        resolvedAt:
          new Date().toISOString(),
      });
    }

    await transactionPromise(transaction);
  }

  async function retryConflict(
    conflict,
  ) {
    const isVersionConflict =
      conflict.reasonCode ===
        "OFFLINE_CONFLICT" &&
      conflict.serverRevision > 0 &&
      conflict.operation === "update";
    const isRetryLimitFailure =
      conflict.reasonCode ===
        "OFFLINE_RETRY_LIMIT_REACHED" &&
      (
        conflict.operation === "create" ||
        conflict.operation === "update"
      );

    if (
      !isVersionConflict &&
      !isRetryLimitFailure
    ) {
      return;
    }

    const serverRecord =
      localRecord(
        conflict.entityType,
        conflict.entityId,
      );

    await queueMutation({
      entityType:
        conflict.entityType,
      entityId:
        conflict.entityId,
      operation:
        conflict.operation,
      baseRevision:
        isVersionConflict
          ? conflict.serverRevision
          : conflict.baseRevision,
      payload:
        conflict.localPayload,
      localData: {
        ...(serverRecord?.data || {}),
        ...payloadToLocalData(
          conflict.entityType,
          conflict.localPayload,
        ),
      },
      clientMutationId:
        isRetryLimitFailure
          ? conflict.clientMutationId
          : null,
    });

    await resolveConflict(
      conflict.id,
    );
  }

  async function reviewChanges() {
    const conflicts = (
      await allRows("conflicts")
    ).filter(
      (item) =>
        item.ownerProfileId ===
          state.workspace.ownerProfileId &&
        item.workspaceId ===
          state.workspace.workspaceId &&
        item.status === "unresolved",
    );

    if (conflicts.length === 0) {
      showToast(
        "There are no records waiting for review.",
      );
      return;
    }

    const modal = openModal(
      "Review offline changes",
      "BOPA never overwrites a newer online record without your approval.",
      `
        <div class="offline-form">
          <div class="review-list">
            ${conflicts
              .map(
                (conflict) => `
                  <article
                    class="review-item"
                    data-conflict-id="${escapeHtml(conflict.id)}"
                  >
                    <h3 class="review-title">
                      ${escapeHtml(titleCase(conflict.entityType))}
                    </h3>
                    <p class="review-copy">
                      ${escapeHtml(
                        conflict.reasonMessage ||
                        "This record changed online or could not be saved.",
                      )}
                    </p>
                    <div class="review-actions">
                      ${
                        conflict.reasonCode ===
                          "OFFLINE_CONFLICT" &&
                        conflict.serverRevision >
                          0 &&
                        conflict.operation ===
                          "update"
                          ? `
                            <button
                              class="offline-action"
                              type="button"
                              data-use-local-version
                            >
                              Use my changes
                            </button>
                          `
                          : conflict.reasonCode ===
                              "OFFLINE_RETRY_LIMIT_REACHED"
                            ? `
                              <button
                                class="offline-action"
                                type="button"
                                data-retry-failed-change
                              >
                                Try again
                              </button>
                            `
                            : ""
                      }
                      <button
                        class="offline-action secondary"
                        type="button"
                        data-keep-online-version
                      >
                        ${
                          conflict.reasonCode ===
                          "OFFLINE_CONFLICT"
                            ? "Keep online version"
                            : "Dismiss"
                        }
                      </button>
                    </div>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
      `,
    );

    modal.addEventListener(
      "click",
      async (event) => {
        const item = event.target.closest(
          "[data-conflict-id]",
        );

        if (!item) {
          return;
        }

        const conflict =
          conflicts.find(
            (entry) =>
              entry.id ===
              item.dataset.conflictId,
          );

        if (!conflict) {
          return;
        }

        if (
          event.target.closest(
            "[data-use-local-version]",
          ) ||
          event.target.closest(
            "[data-retry-failed-change]",
          )
        ) {
          await retryConflict(conflict);
          item.remove();
          showToast(
            "Your changes are waiting to sync again.",
          );
        } else if (
          event.target.closest(
            "[data-keep-online-version]",
          )
        ) {
          await resolveConflict(
            conflict.id,
          );
          item.remove();
          showToast(
            conflict.reasonCode ===
              "OFFLINE_CONFLICT"
              ? "The online version was kept."
              : "The change was dismissed.",
          );
        } else {
          return;
        }

        await refreshStatus();

        if (
          modal.querySelectorAll(
            "[data-conflict-id]",
          ).length === 0
        ) {
          closeModal();
          renderWorkspace();
        }
      },
    );
  }

  function formatStorageBytes(
    bytes,
  ) {
    if (
      typeof bytes !== "number" ||
      !Number.isFinite(bytes) ||
      bytes < 0
    ) {
      return "Unavailable";
    }

    if (bytes < 1024) {
      return `${Math.round(bytes)} B`;
    }

    const units = [
      "KB",
      "MB",
      "GB",
      "TB",
    ];
    let value = bytes / 1024;
    let unitIndex = 0;

    while (
      value >= 1024 &&
      unitIndex < units.length - 1
    ) {
      value /= 1024;
      unitIndex += 1;
    }

    return `${value.toFixed(
      value >= 100 ? 0 : 1,
    )} ${units[unitIndex]}`;
  }

  function broadcastStaticEvent(type) {
    if (!("BroadcastChannel" in window)) {
      return;
    }

    const channel =
      new BroadcastChannel(
        "bopa-offline-coordination",
      );

    channel.postMessage({
      type,
      at: new Date().toISOString(),
    });
    channel.close();
  }

  async function readStorageSummary() {
    const [
      outbox,
      conflicts,
      meta,
    ] = await Promise.all([
      allRows("outbox"),
      allRows("conflicts"),
      allRows("meta"),
    ]);
    const current = scope();
    const pendingCount =
      outbox.filter(
        (item) =>
          item.ownerProfileId ===
            current.ownerProfileId &&
          item.workspaceId ===
            current.workspaceId,
      ).length;
    const conflictCount =
      conflicts.filter(
        (item) =>
          item.ownerProfileId ===
            current.ownerProfileId &&
          item.workspaceId ===
            current.workspaceId &&
          item.status === "unresolved",
      ).length;
    const persistence =
      meta.find(
        (item) =>
          item.key ===
          "storagePersistence",
      )?.value || "unknown";

    let usage = null;
    let quota = null;

    if (
      navigator.storage &&
      typeof navigator.storage.estimate ===
        "function"
    ) {
      try {
        const estimate =
          await navigator.storage.estimate();

        usage =
          typeof estimate.usage === "number"
            ? estimate.usage
            : null;
        quota =
          typeof estimate.quota === "number"
            ? estimate.quota
            : null;
      } catch {
        usage = null;
        quota = null;
      }
    }

    const ratio =
      usage !== null &&
      quota !== null &&
      quota > 0
        ? usage / quota
        : null;

    return {
      pendingCount,
      conflictCount,
      persistence,
      usage,
      quota,
      ratio,
    };
  }

  async function clearOfflineStores() {
    const db = await openDatabase();
    const storeNames = Array.from(
      db.objectStoreNames,
    );

    if (storeNames.length === 0) {
      return;
    }

    const transaction = db.transaction(
      storeNames,
      "readwrite",
    );

    for (const storeName of storeNames) {
      transaction
        .objectStore(storeName)
        .clear();
    }

    await transactionPromise(transaction);

    window.localStorage.removeItem(
      "bopa:offline-sync-lease",
    );

    broadcastStaticEvent("data_cleared");
  }

  async function manageOfflineStorage() {
    const summary =
      await readStorageSummary();
    const usagePercent =
      summary.ratio === null
        ? null
        : Math.min(
            100,
            Math.max(
              0,
              Math.round(
                summary.ratio * 100,
              ),
            ),
          );
    const storageClass =
      usagePercent !== null &&
      usagePercent >= 85
        ? "critical"
        : usagePercent !== null &&
            usagePercent >= 70
          ? "warning"
          : "";
    const protectedWork =
      summary.pendingCount > 0 ||
      summary.conflictCount > 0;

    const modal = openModal(
      "Offline storage",
      "Review the downloaded workspace data kept on this device.",
      `
        <div class="offline-form">
          <div class="storage-summary">
            <article class="storage-metric">
              <div class="storage-metric-label">
                Used on this device
              </div>
              <div class="storage-metric-value">
                ${escapeHtml(formatStorageBytes(summary.usage))}
              </div>
            </article>
            <article class="storage-metric">
              <div class="storage-metric-label">
                Available allowance
              </div>
              <div class="storage-metric-value">
                ${escapeHtml(formatStorageBytes(summary.quota))}
              </div>
            </article>
            <article class="storage-metric">
              <div class="storage-metric-label">
                Changes waiting
              </div>
              <div class="storage-metric-value">
                ${summary.pendingCount}
              </div>
            </article>
            <article class="storage-metric">
              <div class="storage-metric-label">
                Records for review
              </div>
              <div class="storage-metric-value">
                ${summary.conflictCount}
              </div>
            </article>
          </div>

          <div class="storage-bar">
            <div
              class="storage-bar-fill ${storageClass}"
              style="width:${usagePercent ?? 0}%"
            ></div>
          </div>

          <div class="storage-explanation">
            ${
              summary.persistence === "granted"
                ? "This browser has protected BOPA offline data from routine storage cleanup."
                : "This browser may remove offline data when device storage is under pressure. Open BOPA online periodically to keep the copy current."
            }
          </div>

          <section class="storage-danger-zone">
            <h3 class="storage-danger-title">
              Clear downloaded data
            </h3>
            <p class="storage-danger-copy">
              This removes the offline workspace from this device only. Your online BOPA records remain unchanged.
              ${
                protectedWork
                  ? " Clear or review waiting changes before removing the copy."
                  : ""
              }
            </p>
            <div class="review-actions">
              <button
                class="offline-action danger"
                type="button"
                data-clear-offline-data
                ${protectedWork ? "disabled" : ""}
              >
                Clear offline copy
              </button>
            </div>
          </section>
        </div>
      `,
    );

    modal.addEventListener(
      "click",
      async (event) => {
        const button =
          event.target.closest(
            "[data-clear-offline-data]",
          );

        if (!button || button.disabled) {
          return;
        }

        if (
          button.dataset.confirmClear !==
          "true"
        ) {
          button.dataset.confirmClear =
            "true";
          button.textContent =
            "Confirm clear";
          return;
        }

        button.disabled = true;
        button.textContent =
          "Clearing…";

        await clearOfflineStores();
        closeModal();

        state.workspace = null;
        state.records = {};

        document.getElementById(
          "content",
        ).hidden = true;
        document.getElementById(
          "empty-state",
        ).hidden = false;
        document.querySelector(
          "#empty-state .empty-title",
        ).textContent =
          "Offline copy cleared";
        document.querySelector(
          "#empty-state .empty-copy",
        ).textContent =
          "Your online BOPA records were not changed. Open your workspace online to download a fresh copy.";

        showToast(
          "The offline copy was removed from this device.",
        );
      },
    );
  }

  async function updatePanelActions() {
    const actions =
      document.getElementById(
        "panel-actions",
      );

    if (!actions || !state.workspace) {
      return;
    }

    actions.innerHTML = "";

    if (
      state.workspaceType === "manager" &&
      state.activeTab === "activity"
    ) {
      actions.insertAdjacentHTML(
        "beforeend",
        `
          <button
            type="button"
            class="offline-action"
            data-add-maintenance
          >
            Record maintenance
          </button>
        `,
      );
    }

    const conflicts = (
      await allRows("conflicts")
    ).filter(
      (item) =>
        item.ownerProfileId ===
          state.workspace.ownerProfileId &&
        item.workspaceId ===
          state.workspace.workspaceId &&
        item.status === "unresolved",
    );

    if (conflicts.length > 0) {
      actions.insertAdjacentHTML(
        "beforeend",
        `
          <button
            type="button"
            class="offline-action danger"
            data-review-offline-changes
          >
            Review ${conflicts.length}
          </button>
        `,
      );
    }
  }

  const originalRenderWorkspace =
    renderWorkspace;

  renderWorkspace = function () {
    originalRenderWorkspace();
    void updatePanelActions();
    void refreshStatus();
  };

  document.addEventListener(
    "click",
    (event) => {
      const editButton =
        event.target.closest(
          "[data-offline-edit]",
        );

      if (editButton) {
        const entityType =
          editButton.dataset
            .offlineEntityType;
        const entityId =
          editButton.dataset
            .offlineEntityId;
        const record = localRecord(
          entityType,
          entityId,
        );

        if (!record) {
          showToast(
            "This offline record is unavailable.",
          );
          return;
        }

        const editor = {
          manager_property:
            editProperty,
          manager_tenant:
            editTenant,
          manager_maintenance_request:
            editMaintenance,
          developer_estate:
            editEstate,
          developer_buyer:
            editBuyer,
        }[entityType];

        if (editor) {
          void editor(record);
        }

        return;
      }

      if (
        event.target.closest(
          "[data-add-maintenance]",
        )
      ) {
        void createMaintenance();
        return;
      }

      if (
        event.target.closest(
          "[data-review-offline-changes]",
        )
      ) {
        void reviewChanges();
        return;
      }

      if (
        event.target.closest(
          "[data-manage-offline-storage]",
        )
      ) {
        void manageOfflineStorage();
      }
    },
  );

  function openRequestedTool() {
    const parameters =
      new URLSearchParams(
        window.location.search,
      );

    if (parameters.get("review") === "1") {
      void reviewChanges();
      return;
    }

    if (parameters.get("storage") === "1") {
      void manageOfflineStorage();
    }
  }

  if ("BroadcastChannel" in window) {
    const coordinationChannel =
      new BroadcastChannel(
        "bopa-offline-coordination",
      );

    coordinationChannel.addEventListener(
      "message",
      (event) => {
        if (
          event.data?.type ===
            "data_cleared" ||
          event.data?.type ===
            "owner_changed"
        ) {
          window.location.reload();
        }
      },
    );
  }

  if (state.workspace) {
    renderWorkspace();
    openRequestedTool();
  } else {
    const waitForWorkspace = setInterval(
      () => {
        if (state.workspace) {
          clearInterval(
            waitForWorkspace,
          );
          renderWorkspace();
          openRequestedTool();
        }
      },
      150,
    );

    setTimeout(
      () =>
        clearInterval(
          waitForWorkspace,
        ),
      10_000,
    );
  }
})();
