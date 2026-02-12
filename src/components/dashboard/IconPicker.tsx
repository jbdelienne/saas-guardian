import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Ban, ChevronDown, Search } from 'lucide-react';

const ICON_CATEGORIES: Record<string, string[]> = {
  'Popular': ['🌐', '💳', '🐙', '💬', '☁️', '▲', '🐕', '✉️', '📞', '🔒', '📊', '🛒', '🏠', '⚡', '🔔', '📁'],
  'Tech & Dev': ['💻', '🖥️', '⌨️', '🖱️', '💾', '📡', '🔧', '⚙️', '🛠️', '🧪', '🧬', '🤖', '🦾', '📟', '🔌', '💡', '🧮', '🖨️', '📠', '🔬', '🧲', '🪫', '🔋', '📲'],
  'Communication': ['📧', '📨', '📩', '📤', '📥', '💌', '📝', '📋', '📎', '🔗', '📢', '📣', '🗣️', '💭', '🗨️', '📱', '☎️', '📞', '📪', '📫', '📬', '📭', '🗳️', '🗂️'],
  'Business': ['💰', '💵', '💸', '📈', '📉', '🏦', '🏢', '🏗️', '📆', '📅', '🗓️', '📌', '🎯', '🏷️', '🧾', '📑', '💼', '🗃️', '🗄️', '📦', '🏪', '🏬', '🏭', '🪙'],
  'Security': ['🔐', '🔑', '🛡️', '🔓', '🚨', '🚫', '⛔', '✅', '❌', '⚠️', '🔍', '🔎', '👁️', '🕵️', '🧱', '🪪', '🪬', '🔏', '🗝️', '🚷', '📛', '🛑', '🆘', '🪖'],
  'Media': ['🎵', '🎬', '📷', '📸', '🎨', '🖼️', '📺', '🎙️', '🎧', '📻', '🎮', '🕹️', '📹', '🎞️', '🖌️', '✏️', '🎭', '🎪', '🎤', '📀', '💿', '📼', '🖍️', '🪩'],
  'Nature': ['🌍', '🌎', '🌏', '☀️', '🌙', '⭐', '🔥', '💧', '🌊', '🍀', '🌸', '🌈', '❄️', '🌤️', '🌪️', '🌋', '🏔️', '🌲', '🌵', '🍄', '🐝', '🦋', '🐳', '🦊'],
  'Symbols': ['❤️', '💜', '💙', '💚', '🧡', '💛', '🖤', '🤍', '♻️', '✨', '💫', '🎉', '🎊', '🏆', '🥇', '💎', '♾️', '⚜️', '🔱', '💠', '🔰', '⚛️', '🪐', '🌀'],
  'Flags & Signs': ['🏁', '🚩', '🏳️', '🏴', '🎌', '📍', '🗺️', '🧭', '🪧', '🔖', '🏮', '🎋', '🎑', '🎏', '🎐', '🧧'],
  'Food & Drink': ['🍕', '🍔', '🍟', '🌮', '🍩', '☕', '🍺', '🧃', '🍷', '🧁', '🍰', '🎂', '🍪', '🥐', '🥤', '🧇'],
  'Transport': ['🚀', '✈️', '🚗', '🚂', '🛸', '🚁', '⛵', '🛥️', '🏎️', '🚌', '🚲', '🛴', '🛩️', '🚢', '🛰️', '🚜'],
  'People & Gestures': ['👤', '👥', '🧑‍💻', '👨‍💼', '👩‍🔬', '🧑‍🎨', '🤝', '👋', '✌️', '🤙', '👍', '👏', '🙌', '💪', '🧑‍🚀', '🦸'],
};

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const allIcons = Object.values(ICON_CATEGORIES).flat();
  const filteredCategories = search
    ? { 'Results': allIcons.filter(icon => icon.includes(search)) }
    : ICON_CATEGORIES;

  const handleSelect = (icon: string) => {
    onChange(icon);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between h-10 font-normal"
        >
          <span className="flex items-center gap-2">
            {value ? (
              <><span className="text-lg">{value}</span> Selected icon</>
            ) : (
              <><Ban className="w-4 h-4 text-muted-foreground" /> No icon</>
            )}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <ScrollArea className="h-64">
          {/* No icon option */}
          <button
            type="button"
            onClick={() => handleSelect('')}
            className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors mb-2 ${
              value === '' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            }`}
          >
            <Ban className="w-4 h-4" />
            No icon
          </button>

          {Object.entries(filteredCategories).map(([category, icons]) => (
            <div key={category} className="mb-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-0.5">
                {category}
              </p>
              <div className="flex gap-0.5 flex-wrap">
                {icons.map((icon, i) => (
                  <button
                    type="button"
                    key={`${icon}-${i}`}
                    onClick={() => handleSelect(icon)}
                    className={`w-8 h-8 rounded-md text-lg flex items-center justify-center transition-colors ${
                      value === icon ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
