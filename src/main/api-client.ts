import { createReadStream } from 'fs'
import OpenAI from 'openai'
import { getApiKey, getBaseUrl } from './config-store.js'
import type { GenerateParams, EditParams, FuseParams, TaskResult } from '../renderer/types/index.js'

function getClient(): OpenAI {
  return new OpenAI({
    base_url: getBaseUrl(),
    apiKey: getApiKey(),
    timeout: 180_000,
  })
}

export async function generateImages(params: GenerateParams): Promise<TaskResult> {
  const client = getClient()
  const result = await client.images.generate({
    model: 'gpt-image-2',
    prompt: params.prompt,
    size: params.size as '1024x1024' | '1024x1536' | '1536x1024',
    quality: params.quality as 'low' | 'medium' | 'high',
    n: params.n,
  })

  const images = result.data.map((d) => ({
    b64_json: (d as any).b64_json || '',
    revised_prompt: (d as any).revised_prompt,
  }))

  return { images, revisedPrompt: images[0]?.revised_prompt || '' }
}

export async function editImages(params: EditParams): Promise<TaskResult> {
  const client = getClient()

  const extraBody: Record<string, string> = {
    background: params.background,
    output_format: params.outputFormat,
    input_fidelity: params.fidelity,
  }

  const imageStream = createReadStream(params.imagePath)
  const maskStream = params.maskPath ? createReadStream(params.maskPath) : undefined

  try {
    const result = await client.images.edit({
      model: 'gpt-image-2',
      image: imageStream,
      mask: maskStream,
      prompt: params.prompt,
      size: params.size as any,
      quality: params.quality as any,
      n: params.n,
      extra_body: extraBody,
    })

    const images = result.data.map((d) => ({
      b64_json: (d as any).b64_json || '',
      revised_prompt: (d as any).revised_prompt,
    }))

    return { images, revisedPrompt: images[0]?.revised_prompt || '' }
  } finally {
    imageStream.destroy()
    if (maskStream) maskStream.destroy()
  }
}

export async function fuseImages(params: FuseParams): Promise<TaskResult> {
  const client = getClient()

  const extraBody: Record<string, string> = {
    input_fidelity: params.fidelity,
  }

  const streams = params.imagePaths.map((path) => createReadStream(path))

  try {
    const result = await client.images.edit({
      model: 'gpt-image-2',
      image: streams as any,
      prompt: params.prompt,
      size: params.size as any,
      quality: params.quality as any,
      n: params.n,
      extra_body: extraBody,
    })

    const images = result.data.map((d) => ({
      b64_json: (d as any).b64_json || '',
      revised_prompt: (d as any).revised_prompt,
    }))

    return { images, revisedPrompt: images[0]?.revised_prompt || '' }
  } finally {
    streams.forEach((s) => s.destroy())
  }
}
