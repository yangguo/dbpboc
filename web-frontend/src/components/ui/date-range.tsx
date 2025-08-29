"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "./button";
import { Label } from "./label";

type Props = {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  disabled?: boolean;
};

function fmt(d?: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parse(str?: string): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return null;
  return date;
}

function cnWeekday(idx: number) {
  return ["日", "一", "二", "三", "四", "五", "六"][idx];
}

type CalendarProps = {
  value: string;
  onSelect: (value: string) => void;
};

function Calendar({ value, onSelect }: CalendarProps) {
  const selected = parse(value) || new Date();
  const [cur, setCur] = useState<Date>(parse(value) || new Date());

  const y = cur.getFullYear();
  const m = cur.getMonth();
  const first = new Date(y, m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const years: number[] = [];
  const currentYear = new Date().getFullYear();
  for (let yy = currentYear + 1; yy >= 2010; yy--) years.push(yy);

  const toPrevMonth = () => setCur(new Date(y, m - 1, 1));
  const toNextMonth = () => setCur(new Date(y, m + 1, 1));

  const onPick = (day: number) => {
    const d = new Date(y, m, day);
    onSelect(fmt(d));
  };

  return (
    <div className="w-[18rem] select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={toPrevMonth} className="h-8 w-8 p-0">
            ←
          </Button>
          <select
            className="h-8 rounded-md border border-border bg-background text-foreground px-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={m}
            onChange={(e) => setCur(new Date(y, Number(e.target.value), 1))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>{i + 1}月</option>
            ))}
          </select>
          <select
            className="h-8 rounded-md border border-border bg-background text-foreground px-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={y}
            onChange={(e) => setCur(new Date(Number(e.target.value), m, 1))}
          >
            {years.map((yy) => (
              <option key={yy} value={yy}>{yy}年</option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={toNextMonth} className="h-8 w-8 p-0">
            →
          </Button>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setCur(new Date())} className="text-xs">今天</Button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground mb-2 font-medium">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="py-2">周{cnWeekday(i)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startWeekday }).map((_, i) => (
          <div key={`empty-${i}`} className="h-9" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const isSelected =
            selected.getFullYear() === y && selected.getMonth() === m && selected.getDate() === day;
          const isToday = 
            new Date().getFullYear() === y && new Date().getMonth() === m && new Date().getDate() === day;
          return (
            <button
              key={day}
              onClick={() => onPick(day)}
              className={`h-9 rounded-md text-sm transition-colors font-medium ${
                isSelected 
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" 
                  : isToday
                  ? "bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRange({ start, end, onChange, disabled }: Props) {
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(end);
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setFrom(start), [start]);
  useEffect(() => setTo(end), [end]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpenStart(false);
        setOpenEnd(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const applyPreset = (days: number) => {
    const now = new Date();
    const toStr = fmt(now);
    const past = new Date(now);
    past.setDate(past.getDate() - days + 1);
    const fromStr = fmt(past);
    setFrom(fromStr);
    setTo(toStr);
    onChange(fromStr, toStr);
  };

  const clear = () => {
    setFrom("");
    setTo("");
    onChange("", "");
  };

  return (
    <div className="flex flex-col gap-2" ref={wrapRef}>
      <Label className="text-sm">发布日期</Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            onClick={() => { if (!disabled) setOpenStart((v) => !v); }}
            className="min-w-[9.5rem] justify-start bg-background border-border hover:bg-accent hover:text-accent-foreground text-foreground"
            disabled={disabled}
          >
            {from || "开始日期"}
          </Button>
          {openStart && (
            <div className="absolute z-50 mt-2 rounded-md border bg-popover p-3 shadow-lg">
              <Calendar
                value={from || fmt(new Date())}
                onSelect={(val) => { setFrom(val); onChange(val, to); setOpenStart(false); }}
              />
            </div>
          )}
        </div>
        <span className="text-sm text-muted-foreground">-</span>
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            onClick={() => { if (!disabled) setOpenEnd((v) => !v); }}
            className="min-w-[9.5rem] justify-start bg-background border-border hover:bg-accent hover:text-accent-foreground text-foreground"
            disabled={disabled}
          >
            {to || "结束日期"}
          </Button>
          {openEnd && (
            <div className="absolute z-50 mt-2 rounded-md border bg-popover p-3 shadow-lg">
              <Calendar
                value={to || fmt(new Date())}
                onSelect={(val) => { setTo(val); onChange(from, val); setOpenEnd(false); }}
              />
            </div>
          )}
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset(7)} disabled={disabled} className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800">
          近7天
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset(30)} disabled={disabled} className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800">
          近30天
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={disabled} className="text-muted-foreground hover:text-foreground">
          清空
        </Button>
      </div>
    </div>
  );
}
