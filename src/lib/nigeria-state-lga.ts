export const NIGERIA_STATE_LGA_MAP: Record<string, string[]> = {
  Lagos: [
    "Agege",
    "Ajeromi-Ifelodun",
    "Alimosho",
    "Amuwo-Odofin",
    "Apapa",
    "Badagry",
    "Epe",
    "Eti-Osa",
    "Ibeju-Lekki",
    "Ifako-Ijaiye",
    "Ikeja",
    "Ikorodu",
    "Kosofe",
    "Lagos Island",
    "Lagos Mainland",
    "Mushin",
    "Ojo",
    "Oshodi-Isolo",
    "Shomolu",
    "Surulere",
  ],
  Abuja: [
    "Abaji",
    "Bwari",
    "Gwagwalada",
    "Kuje",
    "Kwali",
    "Municipal Area Council",
  ],
  Ogun: [
    "Abeokuta North",
    "Abeokuta South",
    "Ado-Odo/Ota",
    "Ewekoro",
    "Ifo",
    "Ijebu East",
    "Ijebu North",
    "Ijebu Ode",
    "Obafemi Owode",
    "Odeda",
    "Sagamu",
  ],
  Oyo: [
    "Akinyele",
    "Egbeda",
    "Ibadan North",
    "Ibadan North-East",
    "Ibadan North-West",
    "Ibadan South-East",
    "Ibadan South-West",
    "Lagelu",
    "Oluyole",
    "Ona Ara",
  ],
  Rivers: ["Obio-Akpor", "Okrika", "Oyigbo", "Port Harcourt"],
};

export function getNigeriaStateOptions() {
  return Object.keys(NIGERIA_STATE_LGA_MAP).map((state) => ({
    label: state,
    value: state,
  }));
}

export function getNigeriaLgaOptions(state: string) {
  return (NIGERIA_STATE_LGA_MAP[state] ?? []).map((lga) => ({
    label: lga,
    value: lga,
  }));
}
