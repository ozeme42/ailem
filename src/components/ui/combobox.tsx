
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type ComboboxProps = {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: string) => void;
    onCreate?: (value: string) => void;
    placeholder?: string;
    notfoundText?: string;
    createText?: string;
}

export function Combobox({ 
    options, 
    value, 
    onChange,
    onCreate,
    placeholder = "Select an option...",
    notfoundText = "No option found.",
    createText = "Create"
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>
                {onCreate ? (
                     <Button 
                        variant="ghost" 
                        className="w-full justify-start"
                        onClick={(e) => {
                            const inputValue = (e.currentTarget.closest('.cmdk-root')?.querySelector('.cmdk-input') as HTMLInputElement)?.value;
                            if (inputValue) {
                                onCreate(inputValue);
                                onChange(inputValue);
                                setOpen(false);
                            }
                        }}
                     >
                        {createText} "{ (typeof document !== 'undefined' && document.querySelector('.cmdk-input')) ? (document.querySelector('.cmdk-input') as HTMLInputElement).value : ''}"
                    </Button>
                ) : notfoundText}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
             {onCreate && <CommandSeparator />}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
