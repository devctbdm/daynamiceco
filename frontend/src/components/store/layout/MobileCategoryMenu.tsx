'use client';
import React, { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, MenuIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useResource } from '@/hooks/useResource';
import { categoriesResource } from '@/lib/resources';

type TreeCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  active?: boolean;
  children: TreeCategory[];
};

function buildTree(
  categories: {
    _id: string;
    name: string;
    slug: string;
    parentId: string | null;
    active: boolean;
    sortOrder: number;
  }[]
): TreeCategory[] {
  const map = new Map<string, TreeCategory>();
  const roots: TreeCategory[] = [];

  for (const cat of categories.filter((c) => c.active !== false)) {
    map.set(cat._id, {
      id: cat._id,
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId,
      children: [],
    });
  }

  for (const cat of categories.filter((c) => c.active !== false)) {
    const node = map.get(cat._id)!;
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// Mobile category drawer, triggered by a hamburger button in the top nav.
export const MobileCategoryMenu = () => {
  const router = useRouter();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const { data: categoryData } = useResource(categoriesResource);
  const categories = useMemo(
    () => buildTree(categoryData || []),
    [categoryData]
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const renderMobileCategory = (cat: TreeCategory, depth = 0) => {
    if (cat.active === false) return null;

    const paddingLeft = depth * 16;
    const isExpanded = expandedCategories.has(cat.id);
    const hasChildren = cat.children.length > 0;

    if (hasChildren) {
      return (
        <div key={cat.id}>
          <div
            className="flex items-center justify-between rounded py-2 cursor-pointer hover:bg-gray-100"
            style={{ paddingLeft }}
          >
            <span
              className="flex-1 font-medium"
              onClick={() => router.push(`/products/${cat.slug}`)}
            >
              {cat.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory(cat.id);
              }}
              className="rounded p-1 hover:bg-gray-200"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          {isExpanded && (
            <div className="flex flex-col">
              {cat.children.map((child) =>
                renderMobileCategory(child, depth + 1)
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={cat.id}
        className="cursor-pointer rounded py-2 hover:bg-gray-100"
        style={{ paddingLeft }}
        onClick={() => router.push(`/products/${cat.slug}`)}
      >
        {cat.name}
      </div>
    );
  };

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Open categories"
          />
        }
      >
        <MenuIcon className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto px-4">
        <SheetHeader>
          <SheetTitle className="sr-only">Categories</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-2">
          {categories.map((cat) => renderMobileCategory(cat, 0))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
