'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  Menubar,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarMenu,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/components/ui/menubar';

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

export const CategoryNav = () => {
  const router = useRouter();
  const { data: categoryData } = useResource(categoriesResource);
  const categories = useMemo(
    () => buildTree(categoryData || []),
    [categoryData]
  );
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const renderCategory = (cat: TreeCategory, depth = 0) => {
    if (cat.active === false) return null;

    if (depth === 0) {
      return (
        <MenubarMenu key={cat.id}>
          <MenubarTrigger>{cat.name}</MenubarTrigger>
          <MenubarContent>
            {cat.children.length > 0 ? (
              cat.children.map((child) => renderCategory(child, depth + 1))
            ) : (
              <MenubarItem onClick={() => router.push(`/products/${cat.slug}`)}>
                View all {cat.name}
              </MenubarItem>
            )}
          </MenubarContent>
        </MenubarMenu>
      );
    } else {
      if (cat.children.length > 0) {
        return (
          <MenubarSub key={cat.id}>
            <MenubarSubTrigger>{cat.name}</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarGroup>
                {cat.children.map((child) => renderCategory(child, depth + 1))}
              </MenubarGroup>
            </MenubarSubContent>
          </MenubarSub>
        );
      } else {
        return (
          <MenubarItem
            key={cat.id}
            onClick={() => router.push(`/products/${cat.slug}`)}
          >
            {cat.name}
          </MenubarItem>
        );
      }
    }
  };

  return (
    <div
      className={`hidden lg:block fixed top-16 left-0 right-0 z-40 border-b border-gray-200 bg-background/95 py-2 backdrop-blur transition-all duration-300 lg:top-20 ${
        scrolled ? 'shadow-xl' : 'shadow-lg'
      }`}
    >
      {/* Desktop Menu (mobile category menu lives in TopNav) */}
      <div className="hidden lg:block">
        <Menubar className="w-full max-w-7xl mx-auto border-0 rounded-none shadow-none">
          {categories.map((cat) => renderCategory(cat))}
        </Menubar>
      </div>
    </div>
  );
};
