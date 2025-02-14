'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Coffee } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface DonateButtonProps {
  variant?: 'default' | 'secondary' | 'outline'
}

export function DonateButton({ variant = 'default' }: DonateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost"
          className={cn(
            "gap-2 rounded-full transition-all duration-200",
            variant === 'outline'
              ? "bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm"
              : cn(
                  "bg-[#FF813F] hover:bg-[#FF9B3F]",
                  "text-white font-medium",
                  "shadow-[0_2px_8px_rgba(255,129,63,0.25)]",
                  "hover:shadow-[0_4px_12px_rgba(255,129,63,0.35)]",
                  "border border-[#FF9B3F]/20",
                  "transition-all duration-300"
                )
          )}
        >
          <Coffee 
            className={cn(
              "h-4 w-4",
              variant === 'outline' ? "animate-pulse" : "animate-bounce"
            )} 
          />
          <span className="font-medium">
            {variant === 'outline' ? 'Support' : 'Buy me a coffee'}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-md border-white/20">
        <DialogHeader>
          <DialogTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600 font-bold flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Support the Project
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            If you find this tool helpful, consider buying me a coffee! Your support helps keep this project free and updated.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative w-48 h-48 p-4 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow duration-200">
            <Image
              src="/upi-qr.png"
              alt="UPI QR Code"
              fill
              className="object-contain p-2"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-600/10 rounded-2xl" />
          </div>
          <p className="text-sm text-center text-slate-500">
            Scan with any UPI app to donate
          </p>
          <div className="flex flex-col items-center gap-2">
            <p className="font-medium text-slate-700">UPI ID:</p>
            <div className="group relative">
              <code className="relative rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-600/10 px-4 py-2 font-mono text-sm text-slate-700">
                pgywww-1@okhdfcbank
              </code>
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 