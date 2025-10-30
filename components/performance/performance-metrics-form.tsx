'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Eye, Heart, MessageCircle, Share2, Bookmark, TrendingUp } from 'lucide-react'

/**
 * Zod schema for performance metrics form
 */
const performanceFormSchema = z.object({
  platform: z.enum(['tiktok', 'instagram']),
  views: z.number().min(0, 'Views must be 0 or greater').int(),
  likes: z.number().min(0, 'Likes must be 0 or greater').int(),
  comments: z.number().min(0, 'Comments must be 0 or greater').int(),
  shares: z.number().min(0, 'Shares must be 0 or greater').int(),
  saves: z.number().min(0, 'Saves must be 0 or greater').int().optional().nullable(),
  watch_time_seconds: z.number().min(0).optional().nullable(),
  completion_rate: z
    .number()
    .min(0, 'Completion rate must be between 0-100')
    .max(100, 'Completion rate must be between 0-100')
    .optional()
    .nullable(),
  traffic_source: z.enum(['fyp', 'profile', 'hashtag', 'share', 'other']).optional().nullable(),
  recorded_at: z.string().optional(),
})

type PerformanceFormValues = z.infer<typeof performanceFormSchema>

interface PerformanceMetricsFormProps {
  videoId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function PerformanceMetricsForm({
  videoId,
  onSuccess,
  onCancel,
}: PerformanceMetricsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<PerformanceFormValues>({
    resolver: zodResolver(performanceFormSchema),
    defaultValues: {
      platform: 'tiktok',
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: null,
      watch_time_seconds: null,
      completion_rate: null,
      traffic_source: null,
      recorded_at: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
    },
  })

  const selectedPlatform = form.watch('platform')

  async function onSubmit(data: PerformanceFormValues) {
    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/videos/${videoId}/performance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          // Convert recorded_at to ISO string if provided
          recorded_at: data.recorded_at
            ? new Date(data.recorded_at).toISOString()
            : new Date().toISOString(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to save performance metrics')
      }

      toast({
        title: 'Performance metrics saved!',
        description: `Successfully recorded metrics for ${data.platform}`,
      })

      form.reset()
      onSuccess?.()
    } catch (error: any) {
      console.error('Error saving performance metrics:', error)
      toast({
        title: 'Failed to save metrics',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Platform Selection */}
        <FormField
          control={form.control}
          name="platform"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Platform</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="tiktok">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">TikTok</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="instagram">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Instagram</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Where did you post this video?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Core Metrics Grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Core Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Views */}
            <FormField
              control={form.control}
              name="views"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Views
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Likes */}
            <FormField
              control={form.control}
              name="likes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Likes
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Comments */}
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Comments
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Shares */}
            <FormField
              control={form.control}
              name="shares"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Shares
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Saves (more prominent on Instagram) */}
            {selectedPlatform === 'instagram' && (
              <FormField
                control={form.control}
                name="saves"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Bookmark className="h-4 w-4" />
                      Saves
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Optional"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* Advanced Metrics - Optional Accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="advanced">
            <AccordionTrigger>
              <span className="text-sm font-medium">Advanced Metrics (Optional)</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Watch Time */}
              <FormField
                control={form.control}
                name="watch_time_seconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Watch Time (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Optional"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Total watch time across all views
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Completion Rate */}
              <FormField
                control={form.control}
                name="completion_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Optional (0-100)"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Percentage of viewers who watched to the end
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Traffic Source */}
              <FormField
                control={form.control}
                name="traffic_source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Traffic Source
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fyp">For You Page (FYP)</SelectItem>
                        <SelectItem value="profile">Profile</SelectItem>
                        <SelectItem value="hashtag">Hashtag</SelectItem>
                        <SelectItem value="share">Shared Link</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Where did most views come from?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Recorded At Timestamp */}
              <FormField
                control={form.control}
                name="recorded_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>
                      When were these metrics recorded? (defaults to now)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Metrics'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
