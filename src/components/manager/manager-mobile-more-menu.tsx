"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Ellipsis, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Item = { label: string; href: string; icon: LucideIcon };
type Section = { label: string; items: Item[] };

export function ManagerMobileMoreMenu({ sections }: { sections: Section[] }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const active = sections.some((section) => section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)));

  return <>
    <button type="button" onClick={() => setIsOpen(true)} aria-current={active ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-bold", active ? "bg-primary-soft text-primary" : "text-text-muted hover:bg-primary-soft hover:text-primary")}><Ellipsis aria-hidden="true" size={21} strokeWidth={2.6} /><span>More</span></button>
    {isOpen ? <div className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/30" onClick={() => setIsOpen(false)} /><div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-6 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-extrabold text-text-strong">More</h2><button type="button" aria-label="Close menu" onClick={() => setIsOpen(false)} className="flex size-10 items-center justify-center rounded-lg hover:bg-surface"><X aria-hidden="true" size={20} /></button></div><div className="space-y-5">{sections.map((section) => section.items.length ? <section key={section.label}><h3 className="mb-2 text-xs font-black uppercase tracking-wide text-text-muted">{section.label}</h3><div className="space-y-1">{section.items.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-extrabold text-text-strong hover:bg-surface"><Icon aria-hidden="true" size={18} className="text-primary" />{item.label}</Link>; })}</div></section> : null)}</div></div></div> : null}
  </>;
}
