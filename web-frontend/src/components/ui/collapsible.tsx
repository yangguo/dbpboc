"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface CollapsibleTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  onClick?: () => void
}

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

const CollapsibleContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({ open: false, onOpenChange: () => {} })

const Collapsible = ({ open = false, onOpenChange, children }: CollapsibleProps) => {
  const [isOpen, setIsOpen] = React.useState(open)
  
  React.useEffect(() => {
    setIsOpen(open)
  }, [open])
  
  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }
  
  return (
    <CollapsibleContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </CollapsibleContext.Provider>
  )
}

const CollapsibleTrigger = ({ asChild, children, onClick }: CollapsibleTriggerProps) => {
  const { open, onOpenChange } = React.useContext(CollapsibleContext)
  
  const handleClick = () => {
    onOpenChange(!open)
    onClick?.()
  }
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ...(children.props as Record<string, any>),
      onClick: handleClick
    })
  }
  
  return (
    <button onClick={handleClick}>
      {children}
    </button>
  )
}

const CollapsibleContent = ({ children, className }: CollapsibleContentProps) => {
  const { open } = React.useContext(CollapsibleContext)
  
  if (!open) return null
  
  return (
    <div className={cn("animate-in slide-in-from-top-2 duration-200", className)}>
      {children}
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }