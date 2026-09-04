"use client";

import { useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";

interface DragDropListProps<T extends { id: string }> {
  items: T[];
  onReorder: (newOrder: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  keyField?: string;
}

export function DragDropList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: DragDropListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      setOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const newItems = [...items];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, moved);
    onReorder(newItems);

    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-2 transition-opacity ${
            dragIndex === index ? "opacity-40" : ""
          } ${overIndex === index && dragIndex !== null ? "border-t-2 border-blue-400" : ""}`}
        >
          <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0">
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">{renderItem(item, index)}</div>
        </div>
      ))}
    </div>
  );
}
