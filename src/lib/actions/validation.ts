'use server'

import yaml from 'js-yaml'

export interface ValidationResult {
  valid: boolean
  error?: string
  line?: number
  column?: number
}

export async function validateCloudInit(content: string): Promise<ValidationResult> {
  if (!content || content.trim() === '') {
    return { valid: true }
  }

  try {
    // 1. Basic YAML Syntax Check
    const parsed = yaml.load(content)
    
    // 2. Simple Cloud-Init Header Check
    if (typeof content === 'string' && !content.startsWith('#cloud-config')) {
      // It's optional for overrides but good practice
    }

    // 3. Schema validation (basic checks for common mistakes)
    if (parsed && typeof parsed === 'object') {
      const p = parsed as any
      
      // Check for common top-level keys mismatch
      const autoinstallKeys = ['identity', 'storage', 'ssh', 'late-commands', 'early-commands']
      const hasAutoinstallKeys = autoinstallKeys.some(k => k in p)
      
      if (hasAutoinstallKeys && !('autoinstall' in p)) {
        // This is a common mistake: putting autoinstall keys at top level
        // return { valid: false, error: 'Autoinstall keys detected at top level. They must be under an "autoinstall:" key for ISOs.' }
      }
    }

    return { valid: true }
  } catch (e: any) {
    return {
      valid: false,
      error: e.message,
      line: e.mark?.line + 1,
      column: e.mark?.column + 1
    }
  }
}
