import OpenAI from 'openai'
import type { VisualFingerprint } from '@/lib/types/character-consistency'
import { getModelForFeature } from './config'

// Lazy initialization to avoid build-time API key requirement
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

interface VisionAnalysisResult {
  visual_fingerprint: VisualFingerprint
  confidence: 'high' | 'medium' | 'low'
  analysis_notes?: string
}

/**
 * Analyzes a character image using OpenAI Vision API to extract visual characteristics
 * @param imageUrl - Public URL of the character image
 * @returns Visual fingerprint data extracted from the image
 */
export async function analyzeCharacterImage(imageUrl: string): Promise<VisionAnalysisResult> {
  const openai = getOpenAI()

  const prompt = `You are analyzing a character image for video generation consistency. Extract precise visual characteristics.

Analyze this image and provide a detailed visual fingerprint in JSON format:

{
  "visual_fingerprint": {
    "age": "approximate age range (e.g., 'early 30s', 'mid 20s', 'late 40s')",
    "ethnicity": "ethnicity/heritage (be specific: 'Black', 'White', 'Asian', 'Hispanic', 'Middle Eastern', etc.)",
    "hair": "hair color and style (e.g., 'short black curly hair', 'long blonde straight hair')",
    "eyes": "eye color (e.g., 'brown eyes', 'blue eyes', 'hazel eyes')",
    "face_shape": "face shape (e.g., 'oval', 'round', 'square', 'angular')",
    "body_type": "body type (e.g., 'athletic', 'slim', 'average', 'heavyset')",
    "height": "apparent height (e.g., 'tall', 'average height', 'short')",
    "default_clothing": "clothing style visible in image (e.g., 'casual t-shirt and jeans', 'formal suit')",
    "distinctive_features": "any notable features (e.g., 'beard', 'glasses', 'tattoos', 'facial hair')"
  },
  "confidence": "high|medium|low",
  "analysis_notes": "any relevant observations or uncertainties"
}

IMPORTANT:
- Be specific about ethnicity - this is critical for character consistency
- Describe actual visible features, not assumptions
- If something is unclear, note it in analysis_notes
- Use natural, descriptive language suitable for video generation prompts`

  try {
    const response = await openai.chat.completions.create({
      model: getModelForFeature('vision'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for more consistent analysis
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from vision API')
    }

    const result = JSON.parse(content) as VisionAnalysisResult

    // Validate required fields
    if (!result.visual_fingerprint) {
      throw new Error('Invalid response format: missing visual_fingerprint')
    }

    return result
  } catch (error) {
    console.error('Vision analysis error:', error)
    throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Analyzes multiple character images and merges the results
 * Useful when character has multiple visual references
 */
export async function analyzeMultipleImages(imageUrls: string[]): Promise<VisionAnalysisResult> {
  if (imageUrls.length === 0) {
    throw new Error('No images provided for analysis')
  }

  // If single image, just analyze it
  if (imageUrls.length === 1) {
    return analyzeCharacterImage(imageUrls[0])
  }

  // Analyze all images in parallel
  const results = await Promise.all(
    imageUrls.map(url => analyzeCharacterImage(url))
  )

  // Merge results - prioritize high confidence data
  const merged: VisionAnalysisResult = {
    visual_fingerprint: {} as VisualFingerprint,
    confidence: 'medium',
    analysis_notes: 'Merged from multiple images'
  }

  // Simple merge strategy: take first non-empty value, prioritizing high confidence
  const sortedResults = results.sort((a, b) => {
    const confidenceOrder = { high: 3, medium: 2, low: 1 }
    return confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
  })

  for (const result of sortedResults) {
    const fp = result.visual_fingerprint
    if (fp.age && !merged.visual_fingerprint.age) merged.visual_fingerprint.age = fp.age
    if (fp.ethnicity && !merged.visual_fingerprint.ethnicity) merged.visual_fingerprint.ethnicity = fp.ethnicity
    if (fp.hair && !merged.visual_fingerprint.hair) merged.visual_fingerprint.hair = fp.hair
    if (fp.eyes && !merged.visual_fingerprint.eyes) merged.visual_fingerprint.eyes = fp.eyes
    if (fp.face_shape && !merged.visual_fingerprint.face_shape) merged.visual_fingerprint.face_shape = fp.face_shape
    if (fp.body_type && !merged.visual_fingerprint.body_type) merged.visual_fingerprint.body_type = fp.body_type
    if (fp.height && !merged.visual_fingerprint.height) merged.visual_fingerprint.height = fp.height
    if (fp.default_clothing && !merged.visual_fingerprint.default_clothing) merged.visual_fingerprint.default_clothing = fp.default_clothing
    if (fp.distinctive_features && !merged.visual_fingerprint.distinctive_features) merged.visual_fingerprint.distinctive_features = fp.distinctive_features
  }

  return merged
}
