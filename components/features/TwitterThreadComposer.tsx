"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CharacterCounter } from "@/components/ui/CharacterCounter";
import { getTwitterCharacterCount } from "@/lib/utils/characterCount";
import {
  IconPlus,
  IconTrash,
  IconChevronUp,
  IconChevronDown,
  IconBrandX,
  IconGripVertical,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TwitterThreadComposerProps {
  value: string[]; // Array of tweets in the thread
  onChange: (tweets: string[]) => void;
  disabled?: boolean;
}

const MAX_TWEETS = 25; // Twitter API limit
const MAX_CHARS_PER_TWEET = 280;

interface SortableTweetItemProps {
  id: string;
  tweet: string;
  index: number;
  disabled: boolean;
  charCount: number;
  isOverLimit: boolean;
  isEmpty: boolean;
  totalTweets: number;
  onTweetChange: (index: number, content: string) => void;
  onMoveTweetUp: (index: number) => void;
  onMoveTweetDown: (index: number) => void;
  onRemoveTweet: (index: number) => void;
}

function SortableTweetItem({
  id,
  tweet,
  index,
  disabled,
  charCount,
  isOverLimit,
  isEmpty,
  totalTweets,
  onTweetChange,
  onMoveTweetUp,
  onMoveTweetDown,
  onRemoveTweet,
}: SortableTweetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative rounded-lg border p-4 transition-colors",
        isOverLimit && "border-destructive bg-destructive/5",
        isEmpty && totalTweets > 1 && "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Tweet Number Badge */}
      <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground z-10">
        {index + 1}
      </div>

      {/* Drag Handle */}
      <button
        type="button"
        className={cn(
          "absolute -left-10 top-4 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary hover:scale-110 transition-all duration-150",
          disabled && "cursor-not-allowed opacity-50 hover:text-muted-foreground hover:scale-100"
        )}
        {...attributes}
        {...listeners}
        disabled={disabled}
        title="Drag to reorder"
      >
        <IconGripVertical className="h-5 w-5" />
      </button>

      {/* Tweet Content */}
      <div className="space-y-2">
        <Textarea
          value={tweet}
          onChange={(e) => onTweetChange(index, e.target.value)}
          disabled={disabled}
          placeholder={`Tweet ${index + 1}${index === 0 ? " (First tweet in thread)" : ""}`}
          className={cn(
            "min-h-[100px] resize-none",
            isOverLimit && "border-destructive focus-visible:ring-destructive"
          )}
          maxLength={MAX_CHARS_PER_TWEET + 100} // Allow typing a bit over for better UX
        />

        {/* Character Counter */}
        <div className="flex items-center justify-between">
          <CharacterCounter
            count={charCount}
            max={MAX_CHARS_PER_TWEET}
            warnAt={260}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {/* Move Up */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMoveTweetUp(index)}
              disabled={disabled || index === 0}
              className="h-8 w-8 p-0"
              title="Move up"
            >
              <IconChevronUp className="h-4 w-4" />
            </Button>

            {/* Move Down */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMoveTweetDown(index)}
              disabled={disabled || index === totalTweets - 1}
              className="h-8 w-8 p-0"
              title="Move down"
            >
              <IconChevronDown className="h-4 w-4" />
            </Button>

            {/* Delete */}
            {totalTweets > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveTweet(index)}
                disabled={disabled}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                title="Delete tweet"
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Warnings */}
        {isEmpty && totalTweets > 1 && (
          <p className="text-xs text-yellow-600 dark:text-yellow-500">
            ⚠️ This tweet is empty and will be removed when scheduling
          </p>
        )}
        {isOverLimit && (
          <p className="text-xs text-destructive">
            ⚠️ Tweet exceeds {MAX_CHARS_PER_TWEET} character limit
          </p>
        )}
      </div>
    </div>
  );
}

export function TwitterThreadComposer({
  value,
  onChange,
  disabled = false,
}: TwitterThreadComposerProps) {
  const [tweets, setTweets] = useState<string[]>(value.length > 0 ? value : [""]);

  // Sync internal state with external value
  useEffect(() => {
    if (value.length > 0 && JSON.stringify(value) !== JSON.stringify(tweets)) {
      setTweets(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Notify parent of changes
  const notifyChange = (newTweets: string[]) => {
    setTweets(newTweets);
    onChange(newTweets);
  };

  const handleTweetChange = (index: number, content: string) => {
    const newTweets = [...tweets];
    newTweets[index] = content;
    notifyChange(newTweets);
  };

  const addTweet = () => {
    if (tweets.length < MAX_TWEETS) {
      notifyChange([...tweets, ""]);
    }
  };

  const removeTweet = (index: number) => {
    if (tweets.length > 1) {
      const newTweets = tweets.filter((_, i) => i !== index);
      notifyChange(newTweets);
    }
  };

  const moveTweetUp = (index: number) => {
    if (index > 0) {
      const newTweets = [...tweets];
      [newTweets[index - 1], newTweets[index]] = [
        newTweets[index],
        newTweets[index - 1],
      ];
      notifyChange(newTweets);
    }
  };

  const moveTweetDown = (index: number) => {
    if (index < tweets.length - 1) {
      const newTweets = [...tweets];
      [newTweets[index], newTweets[index + 1]] = [
        newTweets[index + 1],
        newTweets[index],
      ];
      notifyChange(newTweets);
    }
  };

  const getTweetCharCount = (content: string) => {
    return getTwitterCharacterCount(content);
  };

  const isTweetOverLimit = (content: string) => {
    return getTweetCharCount(content) > MAX_CHARS_PER_TWEET;
  };

  // Configure drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tweets.findIndex((_, i) => `tweet-${i}` === active.id);
      const newIndex = tweets.findIndex((_, i) => `tweet-${i}` === over.id);

      const newTweets = arrayMove(tweets, oldIndex, newIndex);
      notifyChange(newTweets);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <IconBrandX className="h-4 w-4" />
          Twitter Thread ({tweets.length} {tweets.length === 1 ? "tweet" : "tweets"})
        </Label>
        {tweets.length < MAX_TWEETS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTweet}
            disabled={disabled}
            className="gap-2"
          >
            <IconPlus className="h-4 w-4" />
            Add Tweet
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tweets.map((_, i) => `tweet-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3 ml-10">
            {tweets.map((tweet, index) => {
              const charCount = getTweetCharCount(tweet);
              const isOverLimit = isTweetOverLimit(tweet);
              const isEmpty = tweet.trim() === "";

              return (
                <SortableTweetItem
                  key={`tweet-${index}`}
                  id={`tweet-${index}`}
                  tweet={tweet}
                  index={index}
                  disabled={disabled}
                  charCount={charCount}
                  isOverLimit={isOverLimit}
                  isEmpty={isEmpty}
                  totalTweets={tweets.length}
                  onTweetChange={handleTweetChange}
                  onMoveTweetUp={moveTweetUp}
                  onMoveTweetDown={moveTweetDown}
                  onRemoveTweet={removeTweet}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Thread Info */}
      <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <IconBrandX className="h-4 w-4" />
          <span>
            Tweets will be published as a thread in order. Maximum {MAX_TWEETS}{" "}
            tweets per thread.
          </span>
        </p>
      </div>
    </div>
  );
}
