import { useState } from 'react';
import { useWorkspaceMembers, WorkspaceMember } from '@/hooks/use-workspace';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, UserCircle, Tag } from 'lucide-react';

interface OwnerTagsEditorProps {
  ownerId: string | null;
  tags: string[];
  onOwnerChange: (ownerId: string | null) => void;
  onTagsChange: (tags: string[]) => void;
  compact?: boolean;
}

export default function OwnerTagsEditor({ ownerId, tags, onOwnerChange, onTagsChange, compact = false }: OwnerTagsEditorProps) {
  const { data: members = [] } = useWorkspaceMembers();
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onTagsChange([...tags, tag]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const ownerMember = members.find((m) => m.user_id === ownerId);
  const ownerLabel = ownerMember?.profile?.display_name || ownerMember?.email || null;

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Owner selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <UserCircle className="w-3.5 h-3.5" />
          Owner
        </label>
        <Select
          value={ownerId || '__none__'}
          onValueChange={(v) => onOwnerChange(v === '__none__' ? null : v)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="No owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No owner</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.profile?.display_name || m.email || m.user_id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" />
          Tags
        </label>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-0.5 hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder="Add tag + Enter"
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}

/** Read-only display for owner + tags */
export function OwnerTagsDisplay({ ownerId, tags }: { ownerId: string | null; tags: string[] }) {
  const { data: members = [] } = useWorkspaceMembers();

  if (!ownerId && (!tags || tags.length === 0)) return null;

  const ownerMember = members.find((m) => m.user_id === ownerId);
  const ownerLabel = ownerMember?.profile?.display_name || ownerMember?.email || null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ownerLabel && (
        <Badge variant="outline" className="text-xs gap-1 font-normal">
          <UserCircle className="w-3 h-3" />
          {ownerLabel}
        </Badge>
      )}
      {tags?.map((tag) => (
        <Badge key={tag} variant="secondary" className="text-xs font-normal">
          {tag}
        </Badge>
      ))}
    </div>
  );
}
