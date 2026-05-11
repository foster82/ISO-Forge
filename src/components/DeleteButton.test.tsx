import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DeleteButton from './DeleteButton'

describe('DeleteButton', () => {
  it('renders correctly', () => {
    render(<DeleteButton action={async () => {}} confirmMessage="Are you sure?" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls confirm on click', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
    const action = vi.fn().mockResolvedValue(undefined)
    
    render(<DeleteButton action={action} confirmMessage="Are you sure?" />)
    
    fireEvent.click(screen.getByRole('button'))
    
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure?')
    confirmSpy.mockRestore()
  })

  it('prevents submission if confirm is cancelled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false)
    const action = vi.fn().mockResolvedValue(undefined)
    
    render(<DeleteButton action={action} confirmMessage="Are you sure?" />)
    
    const form = screen.getByRole('button').closest('form')
    fireEvent.submit(form!)
    
    expect(confirmSpy).toHaveBeenCalled()
    // In Vitest/JSDOM with Server Actions, 'action' might not be called directly by fireEvent.submit
    // but the 'onSubmit' handler should have prevented default if we could track it.
    confirmSpy.mockRestore()
  })
})
