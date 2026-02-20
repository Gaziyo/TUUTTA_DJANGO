import React, { useState } from 'react';
import { DndContext, useDroppable, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Question } from '../types';
import { GripVertical, CheckCircle2, XCircle } from 'lucide-react';

interface DragAndDropProps {
  question: Question;
  onAnswer: (answer: string) => void;
  showResults: boolean;
  isCorrect: boolean;
  isDarkMode: boolean;
  // disabled: boolean; // Removed as it was unused
}

interface DraggableItemProps {
  id: string;
  content: string;
  category: string | null;
  isDarkMode: boolean;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ id, content, category: _category, isDarkMode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  // Style object now only contains properties essential for dnd-kit positioning/animation
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 p-3 rounded-lg cursor-move transition-colors ${
        isDarkMode
          ? 'bg-gray-700 border border-gray-600 hover:bg-gray-600'
          : 'bg-white border border-gray-200 hover:bg-gray-50 shadow-sm'
      } ${isDragging ? 'opacity-50 z-10' : 'opacity-100 z-0'}`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className={`mt-0.5 shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
      <span className={`text-sm leading-5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{content}</span>
    </div>
  );
};

const DroppableZone: React.FC<{
  category: string;
  isDarkMode: boolean;
  itemCount: number;
  children: React.ReactNode;
}> = ({ category, isDarkMode, itemCount, children }) => {
  const { setNodeRef } = useDroppable({ id: category });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-4 min-h-[180px] ${
        isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <h3 className={`text-sm font-semibold tracking-wide mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
        {category}
      </h3>
      {children}
      {itemCount === 0 && (
        <div className={`text-sm text-center pt-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Drop items here
        </div>
      )}
    </div>
  );
};

const DragAndDrop: React.FC<DragAndDropProps> = ({
  question,
  onAnswer,
  showResults,
  isCorrect,
  isDarkMode
  // disabled // Removed as it was unused
}) => {
  const [items, setItems] = useState(question.items || []);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string); // Assuming IDs are always strings based on usage
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    // Exit if not dropped over a valid target or dropped on itself
    if (!over || active.id === over.id) {
      return;
    }

    const activeItem = items.find(item => item.id === active.id);
    if (!activeItem) return; // Should not happen, but safety check

    const overId = over.id as string;
    let targetCategory: string | null = null;

    // Determine the target category
    // Case 1: Dropped directly onto a category zone (DroppableZone id)
    if (question.categories?.includes(overId)) {
      targetCategory = overId;
    } else {
      // Case 2: Dropped onto another item (DraggableItem id)
      const overItem = items.find(item => item.id === overId);
      // If the item dropped onto belongs to a category, use that category
      if (overItem?.category) {
        targetCategory = overItem.category;
      }
      // If dropped onto an uncategorized item, targetCategory remains null (no change)
    }

    // Update state only if the item moved to a *different* valid category
    if (targetCategory !== null && activeItem.category !== targetCategory) {
      const newItems = items.map(item =>
        item.id === active.id ? { ...item, category: targetCategory } : item
      );
      setItems(newItems);
      onAnswer(JSON.stringify(newItems)); // Update the answer state
    }
    // Note: This logic doesn't currently handle moving items *back* to the uncategorized list.
    // That would require adding a droppable zone for the uncategorized area and adjusting here.
  };

  const activeItem = activeId ? items.find(item => item.id === activeId) : null;

  return (
    <div className="space-y-4">
      <div className={`text-base font-medium leading-relaxed ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {question.question}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Uncategorized items */}
        <div className={`rounded-xl border p-4 ${isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className={`text-sm font-semibold tracking-wide mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
            Items to Categorize
          </h3>
          <SortableContext items={items.filter(item => !item.category).map(item => item.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items
                .filter(item => !item.category)
                .map(item => (
                  <DraggableItem key={item.id} id={item.id} content={item.content} category={item.category} isDarkMode={isDarkMode} />
                ))}
            </div>
          </SortableContext>
          {items.filter(item => !item.category).length === 0 && (
             <div className={`text-sm p-4 rounded-lg text-center border border-dashed ${isDarkMode ? 'text-gray-400 bg-gray-900/30 border-gray-700' : 'text-gray-500 bg-white border-gray-300'}`}>
               All items categorized.
             </div>
           )}
        </div>

        {/* Categories Grid */}
        <div className={`grid grid-cols-1 ${question.categories?.length === 1 ? '' : 'sm:grid-cols-2'} gap-4`}>
          {question.categories?.map(category => {
            const categoryItems = items.filter(item => item.category === category);
            return (
              <DroppableZone
                key={category}
                category={category}
                isDarkMode={isDarkMode}
                itemCount={categoryItems.length}
              >
                <SortableContext items={categoryItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {categoryItems.map(item => (
                      <DraggableItem key={item.id} id={item.id} content={item.content} category={item.category} isDarkMode={isDarkMode} />
                    ))}
                  </div>
                </SortableContext>
              </DroppableZone>
            );
          })}
        </div>

        <DragOverlay>
          {activeItem && (
            <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200 shadow-lg'}`}>
              <GripVertical className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{activeItem.content}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {showResults && (
        <div className={`mt-4 p-4 rounded-lg ${
          isCorrect
            ? isDarkMode ? 'bg-green-900/20 text-green-300' : 'bg-green-50 text-green-700'
            : isDarkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'
        }`}>
          <div className="flex items-center space-x-2">
            {isCorrect ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span>All items are correctly categorized!</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5" />
                <span>Some items are in the wrong category. Try again!</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DragAndDrop;
