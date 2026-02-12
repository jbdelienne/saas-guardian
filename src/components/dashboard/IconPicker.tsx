import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Ban, Search } from 'lucide-react';

const ICON_CATEGORIES: Record<string, string[]> = {
  'Popular': ['🌐', '💳', '🐙', '💬', '☁️', '▲', '🐕', '✉️', '📞', '🔒', '📊', '🛒', '🏠', '⚡', '🔔', '📁'],
  'Tech & Dev': ['💻', '🖥️', '⌨️', '🖱️', '💾', '📡', '🔧', '⚙️', '🛠️', '🧪', '🧬', '🤖', '🦾', '📟', '🔌', '💡'],
  'Communication': ['📧', '📨', '📩', '📤', '📥', '💌', '📝', '📋', '📎', '🔗', '📢', '📣', '🗣️', '💭', '🗨️', '📱'],
  'Business': ['💰', '💵', '💸', '📈', '📉', '🏦', '🏢', '🏗️', '📆', '📅', '🗓️', '📌', '🎯', '🏷️', '🧾', '📑'],
  'Security': ['🔐', '🔑', '🛡️', '🔓', '🚨', '🚫', '⛔', '✅', '❌', '⚠️', '🔍', '🔎', '👁️', '🕵️', '🧱', '🪪'],
  'Media': ['🎵', '🎬', '📷', '📸', '🎨', '🖼️', '📺', '🎙️', '🎧', '📻', '🎮', '🕹️', '📹', '🎞️', '🖌️', '✏️'],
  'Nature & Objects': ['🌍', '🌎', '🌏', '☀️', '🌙', '⭐', '🔥', '💧', '🌊', '🍀', '🌸', '🌈', '❄️', '🌤️', '⚡', '🌪️'],
  'Symbols': ['❤️', '💜', '💙', '💚', '🧡', '💛', '🖤', '🤍', '♻️', '✨', '💫', '🎉', '🎊', '🏆', '🥇', '💎'],
};

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('');

  const allIcons = Object.values(ICON_CATEGORIES).flat();
  const filteredCategories = search
    ? { 'Results': allIcons.filter(icon => icon.includes(search)) }
    : ICON_CATEGORIES;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <ScrollArea className="h-48 rounded-lg border border-border bg-card p-2">
        {/* No icon option */}
        <div className="mb-2">
          <button
            type="button"
            onClick={() => onChange('')}
            className={`w-9 h-9 rounded-lg text-sm flex items-center justify-center border transition-colors ${
              value === '' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30'
            }`}
            title="No icon"
          >
            <Ban className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {Object.entries(filteredCategories).map(([category, icons]) => (
          <div key={category} className="mb-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-0.5">
              {category}
            </p>
            <div className="flex gap-1 flex-wrap">
              {icons.map((icon, i) => (
                <button
                  type="button"
                  key={`${icon}-${i}`}
                  onClick={() => onChange(icon)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition-colors ${
                    value === icon ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
