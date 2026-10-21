"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { FALLBACK_CATEGORY } from "@/lib/constants";
import { unwrap } from "@/lib/action-result";
import { addCategoryAction, deleteCategoryAction, renameCategoryAction } from "@/lib/actions";
import type { Application, Category } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

function CategoryRow({ category, usage }: { category: Category; usage: number }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const isFallback = category.name.toLowerCase() === FALLBACK_CATEGORY.toLowerCase();

  async function save() {
    try {
      await unwrap(renameCategoryAction(category.id, name));
      setEditing(false);
      toast.success("Category renamed");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove() {
    try {
      const moved = await unwrap(deleteCategoryAction(category.id));
      toast.success(moved ? `Deleted. ${moved} application${moved === 1 ? "" : "s"} moved to "${FALLBACK_CATEGORY}".` : "Category deleted");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <li className="flex items-center gap-2 py-2">
      {editing ? (
        <>
          <Input
            autoFocus
            aria-label={`Rename ${category.name}`}
            value={name}
            maxLength={60}
            className="h-8"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") {
                setName(category.name);
                setEditing(false);
              }
            }}
          />
          <Button size="icon-sm" variant="ghost" aria-label="Save name" onClick={() => void save()}>
            <CheckIcon />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Cancel rename"
            onClick={() => {
              setName(category.name);
              setEditing(false);
            }}
          >
            <XIcon />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm">{category.name}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {usage} application{usage === 1 ? "" : "s"}
          </span>
          <Button size="icon-sm" variant="ghost" aria-label={`Rename ${category.name}`} onClick={() => setEditing(true)}>
            <PencilIcon />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Delete ${category.name}`}
                disabled={isFallback}
                title={isFallback ? "The fallback category can't be deleted" : undefined}
              >
                <Trash2Icon />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{category.name}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  {usage > 0
                    ? `${usage} application${usage === 1 ? "" : "s"} will be moved to “${FALLBACK_CATEGORY}”.`
                    : "No applications use this category."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => void remove()}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </li>
  );
}

export function CategoryManager({ categories, applications }: { categories: Category[]; applications: Application[] }) {
  const [newName, setNewName] = useState("");
  const usage = new Map<string, number>();
  for (const a of applications) usage.set(a.categoryId, (usage.get(a.categoryId) ?? 0) + 1);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      const c = await unwrap(addCategoryAction(newName));
      setNewName("");
      toast.success(`Added "${c.name}"`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role categories</CardTitle>
        <CardDescription>Used to group applications on the dashboard. Renaming updates every application that uses it.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} usage={usage.get(c.id) ?? 0} />
          ))}
        </ul>
        <form onSubmit={add} className="flex gap-2">
          <Input
            aria-label="New category name"
            placeholder="New category, e.g. Data Engineer"
            value={newName}
            maxLength={60}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={!newName.trim()}>
            <PlusIcon aria-hidden />
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
