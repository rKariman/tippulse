interface DateTabsProps {
  selected: "today" | "tomorrow" | "upcoming";
  onChange: (value: "today" | "tomorrow" | "upcoming") => void;
}

export function DateTabs({ selected, onChange }: DateTabsProps) {
  const tabs = [
    { value: "today" as const, label: "Today" },
    { value: "tomorrow" as const, label: "Tomorrow" },
    { value: "upcoming" as const, label: "Upcoming" },
  ];

  return (
    <div className="flex gap-1 bg-ink-100 p-1 rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            selected === tab.value
              ? "bg-white text-brand-600 shadow-soft"
              : "text-ink-600 hover:text-ink-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
