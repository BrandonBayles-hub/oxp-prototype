// Local fork (oxp-prototype-product): only relative imports were rewritten
// to `@/components/*` / `@/lib/*` to match this app's path alias. No other
// behavioral changes — keep this file in lockstep with the sandbox.
// Original: ../../prototype-sandbox/src/components/composite/MultiSelect.tsx

"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  ChevronDown,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * @summary Interface defining the structure for a group of items in MultiSelect.
 */
export interface MultiSelectGroup {
  label: string;
  items: string[];
}

/**
 * @summary Props for the MultiSelect component.
 * @param {string[]} [value] - Array of selected item values (controlled).
 * @param {(values: string[]) => void} [onValueChange] - Callback when selected values change.
 * @param {string} [placeholder] - Placeholder text when no options are selected.
 * @param {boolean} [searchable=false] - If true, includes a search input to filter options.
 * @param {(option: string, groupLabel?: string) => void} [onAddOption] - Callback to handle adding a new option (enables Add Option button).
 * @param {MultiSelectGroup[]} [groups=[]] - Array of groups, each with a label and items.
 * @param {string} [className] - Class name for the trigger element (when not `contentOnly`).
 * @param {boolean} [contentOnly=false] - If true, renders only the list content without the Popover trigger/wrapper (for use inside FilterChip).
 * @param {boolean} [inModal=false] - If true, uses higher z-index to appear above modal content.
 */
interface MultiSelectProps {
  value?: string[];
  onValueChange?: (values: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  onAddOption?: (option: string, groupLabel?: string) => void;
  groups?: MultiSelectGroup[];
  className?: string;
  contentOnly?: boolean;
  inModal?: boolean;
}

/**
 * @summary Props for an individual item within the MultiSelect list.
 * @description (Internal component, usually not used directly).
 */
interface MultiSelectItemProps {
  value: string;
  children: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const MultiSelectItem = React.forwardRef<
  HTMLDivElement,
  MultiSelectItemProps
>(({ value: _itemValue, children, checked, onCheckedChange }, ref) => (
  <div
    ref={ref}
    className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
    onClick={(e) => {
      e.stopPropagation();
      onCheckedChange?.(!checked);
    }}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Checkbox
        checked={checked}
        className="pointer-events-none"
      />
    </span>
    {children}
  </div>
));
MultiSelectItem.displayName = "MultiSelectItem";

/**
 * @summary Label for a group within the MultiSelect list.
 * @description (Internal component, usually not used directly).
 */
const MultiSelectLabel = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; className?: string }
>(({ children, className }, ref) => (
  <div
    ref={ref}
    className={cn(
      "py-1.5 pl-8 pr-2 text-sm font-semibold bg-muted",
      className,
    )}
  >
    {children}
  </div>
));
MultiSelectLabel.displayName = "MultiSelectLabel";

/**
 * @summary A multi-select dropdown component with search and group functionality.
 * @description Allows users to select multiple options from a list, optionally grouped by categories.
 */
const MultiSelect = React.forwardRef<
  HTMLDivElement,
  MultiSelectProps
>(
  (
    {
      value = [],
      onValueChange,
      placeholder,
      searchable,
      onAddOption,
      groups = [],
      className,
      contentOnly = false,
      inModal = false,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [addModalOpen, setAddModalOpen] =
      React.useState(false);
    const [newOptionValue, setNewOptionValue] =
      React.useState("");
    const [selectedGroup, setSelectedGroup] =
      React.useState<string>("");
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const allOptions = React.useMemo(() => {
      return groups.flatMap((group) => group.items);
    }, [groups]);

    const toggleValue = (itemValue: string) => {
      const newValue = value.includes(itemValue)
        ? value.filter((v) => v !== itemValue)
        : [...value, itemValue];
      onValueChange?.(newValue);
    };

    const toggleGroup = (groupItems: string[]) => {
      const allSelected = groupItems.every((item) =>
        value.includes(item),
      );
      const newValue = allSelected
        ? value.filter((v) => !groupItems.includes(v))
        : Array.from(new Set([...value, ...groupItems]));
      onValueChange?.(newValue);
    };

    const toggleAll = () => {
      onValueChange?.(
        value.length === allOptions.length
          ? []
          : [...allOptions],
      );
    };

    const handleAddOption = (e?: React.MouseEvent) => {
      e?.preventDefault();

      const trimmedValue = newOptionValue.trim();
      if (!trimmedValue) {
        toast({
          title: "Option required",
          description: "Please enter an option value.",
          variant: "default",
        });
        return;
      }

      if (allOptions.includes(trimmedValue)) {
        toast({
          title: "Option already exists",
          description: `The option "${trimmedValue}" already exists in the list.`,
          variant: "default",
        });
        return;
      }

      if (groups.length > 0 && !selectedGroup) {
        toast({
          title: "Group required",
          description:
            "Please select a group for the new option.",
          variant: "default",
        });
        return;
      }

      if (onAddOption) {
        onAddOption(trimmedValue, selectedGroup);
        onValueChange?.([...value, trimmedValue]);
      }

      setAddModalOpen(false);
      setNewOptionValue("");
      setSelectedGroup("");
    };

    React.useEffect(() => {
      if (open && searchable && searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
      if (!open) {
        setSearch("");
      }
    }, [open, searchable]);

    const filteredGroups = React.useMemo(() => {
      if (!search) return groups;
      return groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            item.toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter((group) => group.items.length > 0);
    }, [groups, search]);

    const displayValue = React.useMemo(() => {
      if (value.length === 0)
        return placeholder || "Choose Options";
      if (value.length === 1) return value[0];
      return `${value.length} options selected`;
    }, [value, placeholder]);

    // Calculate the state for "All Options" checkbox
    const getAllOptionsCheckboxState = ():
      | boolean
      | "indeterminate" => {
      if (value.length === 0) return false;
      if (
        value.length === allOptions.length &&
        allOptions.length > 0
      )
        return true;
      return "indeterminate";
    };

    // Calculate the state for group checkboxes
    const getGroupCheckboxState = (
      groupItems: string[],
    ): boolean | "indeterminate" => {
      const selectedCount = groupItems.filter((item) =>
        value.includes(item),
      ).length;
      if (selectedCount === 0) return false;
      if (selectedCount === groupItems.length) return true;
      return "indeterminate";
    };

    const renderContent = () => (
      <div className="max-h-[300px] overflow-auto p-1">
        {searchable && (
          <div className="p-2 pb-1">
            <Input
              ref={searchInputRef}
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        {onAddOption && (
          <div className="p-2">
            <Button
              variant="outline"
              className="w-full h-8"
              onClick={(e) => {
                e.stopPropagation();
                setAddModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Option
            </Button>
          </div>
        )}
        <div className="pt-1">
          <div
            className="relative flex items-center px-2 py-1.5 cursor-pointer hover:bg-accent"
            onClick={(e) => {
              e.stopPropagation();
              toggleAll();
            }}
          >
            <div className="flex items-center gap-2">
              <Checkbox
                checked={getAllOptionsCheckboxState()}
                className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
              />
              <span className="font-medium">All Options</span>
            </div>
          </div>
          {filteredGroups.map((group) => (
            <div key={group.label}>
              <div
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleGroup(group.items);
                }}
              >
                <MultiSelectLabel>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={getGroupCheckboxState(
                        group.items,
                      )}
                      className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
                    />
                    {group.label}
                  </div>
                </MultiSelectLabel>
              </div>
              {group.items.map((item) => (
                <MultiSelectItem
                  key={item}
                  value={item}
                  checked={value.includes(item)}
                  onCheckedChange={() => toggleValue(item)}
                >
                  {item}
                </MultiSelectItem>
              ))}
            </div>
          ))}
        </div>
        {search && filteredGroups.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No matches found
          </div>
        )}
      </div>
    );

    if (contentOnly) {
      return (
        <div ref={ref} className="w-full">
          {renderContent()}
          <Dialog
            open={addModalOpen}
            onOpenChange={setAddModalOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Option</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddOption();
                }}
              >
                <div className="grid gap-4 py-4">
                  {groups.length > 0 && (
                    <div className="grid gap-2">
                      <Label htmlFor="option-group">
                        Select Group
                      </Label>
                      <select
                        id="option-group"
                        value={selectedGroup}
                        onChange={(e) =>
                          setSelectedGroup(e.target.value)
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="">Select a group</option>
                        {groups.map((group) => (
                          <option
                            key={group.label}
                            value={group.label}
                          >
                            {group.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="option-value">
                      Option Value
                    </Label>
                    <Input
                      id="option-value"
                      placeholder="Enter new option"
                      value={newOptionValue}
                      onChange={(e) =>
                        setNewOptionValue(e.target.value)
                      }
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setAddModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      );
    }

    return (
      <>
        <PopoverPrimitive.Root
          open={open}
          onOpenChange={setOpen}
          modal={false}
        >
          <PopoverPrimitive.Trigger asChild>
            <div
              ref={ref}
              className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className,
              )}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
            >
              <span className="flex-1 truncate">
                {displayValue}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
            </div>
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              className={cn(
                "w-[--radix-popover-trigger-width] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                inModal ? "z-[60]" : "z-50"
              )}
              align="start"
              sideOffset={5}
              onOpenAutoFocus={(e) => {
                if (searchable) {
                  e.preventDefault();
                  searchInputRef.current?.focus();
                }
              }}
              onCloseAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(e) => {
                // Allow interaction with dialog content when in modal
                if (inModal) {
                  const target = e.target as Element;
                  if (target.closest('[role="dialog"]') || target.closest('[data-radix-dialog-content]')) {
                    e.preventDefault();
                  }
                }
              }}
            >
              {renderContent()}
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>

        <Dialog
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Option</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddOption();
              }}
            >
              <div className="grid gap-4 py-4">
                {groups.length > 0 && (
                  <div className="grid gap-2">
                    <Label htmlFor="option-group">
                      Select Group
                    </Label>
                    <select
                      id="option-group"
                      value={selectedGroup}
                      onChange={(e) =>
                        setSelectedGroup(e.target.value)
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">Select a group</option>
                      {groups.map((group) => (
                        <option
                          key={group.label}
                          value={group.label}
                        >
                          {group.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="option-value">
                    Option Value
                  </Label>
                  <Input
                    id="option-value"
                    placeholder="Enter new option"
                    value={newOptionValue}
                    onChange={(e) =>
                      setNewOptionValue(e.target.value)
                    }
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);
MultiSelect.displayName = "MultiSelect";

export { MultiSelect };
