import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Tabs({ tabs, defaultTab, className, onChange }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId) => {
    const allowChange = onChange?.(tabId);
    if (allowChange === false) return;
    setActiveTab(tabId);
  };

  const activeContent = tabs.find((t) => t.id === activeTab);

  return (
    <div className={className}>
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text hover:border-gray-300",
            )}
          >
            {tab.icon && <tab.icon className="h-4 w-4 inline mr-2" />}
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-4">{activeContent?.content}</div>
    </div>
  );
}
