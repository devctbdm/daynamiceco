'use client';

import { useMemo, useState } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

type CategoryOption = {
  _id: string;
  name: string;
  parentId: string | null;
};

type FlatCategory = CategoryOption & { depth: number };

function buildFlatList(categories: CategoryOption[]): FlatCategory[] {
  const childrenMap = new Map<string | null, CategoryOption[]>();
  for (const c of categories) {
    const key = c.parentId || null;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(c);
  }

  const result: FlatCategory[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const c of childrenMap.get(parentId) || []) {
      result.push({ ...c, depth });
      walk(c._id, depth + 1);
    }
  };
  walk(null, 0);
  return result;
}

export function CategoryMultiSelect({
  categories,
  value,
  onChange,
}: {
  categories: CategoryOption[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [search, setSearch] = useState('');

  const flatList = useMemo(() => buildFlatList(categories), [categories]);

  const filtered = useMemo(
    () =>
      search.trim()
        ? flatList.filter((c) =>
            c.name.toLowerCase().includes(search.trim().toLowerCase())
          )
        : flatList,
    [flatList, search]
  );

  const toggle = (name: string) => {
    onChange(
      value.includes(name) ? value.filter((v) => v !== name) : [...value, name]
    );
  };

  const remove = (name: string) => {
    onChange(value.filter((v) => v !== name));
  };

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between font-normal"
            />
          }
        >
          {value.length > 0
            ? `${value.length} categor${value.length === 1 ? 'y' : 'ies'} selected`
            : 'Select categories...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-0 pb-1">
              <Input
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8"
              />
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <ScrollArea className="max-h-64">
            {filtered.length === 0 && (
              <DropdownMenuGroup>
                <DropdownMenuLabel className="py-6 text-center text-sm text-muted-foreground">
                  No categories found
                </DropdownMenuLabel>
              </DropdownMenuGroup>
            )}
            {filtered.map((c) => (
              <DropdownMenuCheckboxItem
                key={c._id}
                checked={value.includes(c.name)}
                onCheckedChange={() => toggle(c.name)}
                className="pr-2"
                style={{ paddingLeft: 12 + c.depth * 16 }}
              >
                <span className="truncate">{c.name}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 pr-1">
              {name}
              <button
                type="button"
                onClick={() => remove(name)}
                className="rounded-sm opacity-60 hover:opacity-100"
                aria-label={`Remove ${name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
