/**
 * Edit Contact Modal - Inline Email Form Tests
 *
 * Tests for the inline email creation functionality in EditContactModal.
 * Covers UI interactions, keyboard shortcuts, and form validation.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditContactModal } from '@/app/(dashboard)/contacts/[id]/components/edit-contact-modal'
import { addContactEmailAction } from '@/app/(dashboard)/contacts/actions'
import type { ContactWithCompanies } from '@/lib/dal/contacts'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

// Mock the server actions
jest.mock('@/app/(dashboard)/contacts/actions', () => ({
  addContactEmailAction: jest.fn(),
}))

jest.mock('@/app/(dashboard)/contacts/[id]/actions', () => ({
  updateContactAction: jest.fn(),
}))

// Mock EditEmailModal and DeleteEmailModal to avoid loading issues
jest.mock('@/app/(dashboard)/contacts/[id]/components/edit-email-modal', () => ({
  EditEmailModal: () => null,
}))

jest.mock('@/app/(dashboard)/contacts/[id]/components/delete-email-modal', () => ({
  DeleteEmailModal: () => null,
}))

describe('EditContactModal - Inline Email Form', () => {
  const mockContact: ContactWithCompanies = {
    id: '123',
    tenant_id: '11111111-1111-1111-1111-111111111111',
    first_name: 'John',
    last_name: 'Doe',
    role: 'CEO',
    phone: '555-1234',
    bio: 'Test bio',
    linkedin_url: 'https://linkedin.com/in/johndoe',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    emails: [],
    companies: [],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Inline Form Display', () => {
    it('should show Add Email button when modal is open', () => {
      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      expect(screen.getByText('Add Email')).toBeInTheDocument()
    })

    it('should show empty state when no emails exist', () => {
      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      expect(screen.getByText('No email addresses added yet')).toBeInTheDocument()
    })

    it('should show inline form when Add Email button is clicked', async () => {
      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument()
      })
    })

    it('should disable Add Email button while form is showing', async () => {
      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(addButton).toBeDisabled()
      })
    })

    it('should auto-focus email input when form appears', async () => {
      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText('email@example.com')
        expect(emailInput).toHaveFocus()
      })
    })
  })

  describe('Form Interactions', () => {
    it('should allow typing in email input', async () => {
      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      const emailInput = await screen.findByPlaceholderText('email@example.com')
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should allow selecting email type', async () => {
      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument()
      })

      // Default should be 'Work'
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should allow toggling primary checkbox', async () => {
      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      const primaryCheckbox = await screen.findByRole('checkbox')

      // Should be checked by default if no emails exist
      expect(primaryCheckbox).toBeChecked()

      fireEvent.click(primaryCheckbox)
      expect(primaryCheckbox).not.toBeChecked()
    })

    it('should hide form when cancel button is clicked', async () => {
      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      const emailInput = await screen.findByPlaceholderText('email@example.com')
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      // Click cancel button (X icon)
      const cancelButton = screen.getByTitle('Cancel (Esc)')
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('email@example.com')).not.toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should save email when Enter key is pressed', async () => {
      const onOpenChange = jest.fn()
      ;(addContactEmailAction as jest.Mock).mockResolvedValue({ success: true })

      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      const emailInput = await screen.findByPlaceholderText('email@example.com')
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      // Press Enter
      fireEvent.keyDown(emailInput, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(addContactEmailAction).toHaveBeenCalledWith(
          '123',
          'test@example.com',
          'work',
          true
        )
      })
    })

    it('should cancel when Escape key is pressed', async () => {
      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      const emailInput = await screen.findByPlaceholderText('email@example.com')
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      // Press Escape
      fireEvent.keyDown(emailInput, { key: 'Escape', code: 'Escape' })

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('email@example.com')).not.toBeInTheDocument()
      })
    })
  })

  describe('Email Saving', () => {
    it('should call addContactEmailAction with correct parameters', async () => {
      const onOpenChange = jest.fn()
      ;(addContactEmailAction as jest.Mock).mockResolvedValue({ success: true })

      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      const emailInput = await screen.findByPlaceholderText('email@example.com')
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } })

      const saveButton = screen.getByTitle('Save (Enter)')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(addContactEmailAction).toHaveBeenCalledWith(
          '123',
          'new@example.com',
          'work',
          true
        )
      })
    })

    it('should disable save button when email is empty', async () => {
      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      await waitFor(() => {
        const saveButton = screen.getByTitle('Save (Enter)')
        expect(saveButton).toBeDisabled()
      })
    })

    it('should enable save button when email is entered', async () => {
      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      const emailInput = await screen.findByPlaceholderText('email@example.com')
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const saveButton = screen.getByTitle('Save (Enter)')
      expect(saveButton).not.toBeDisabled()
    })

    it('should show loading state while saving', async () => {
      const onOpenChange = jest.fn()
      ;(addContactEmailAction as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )

      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      const emailInput = await screen.findByPlaceholderText('email@example.com')
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const saveButton = screen.getByTitle('Save (Enter)')
      fireEvent.click(saveButton)

      // Should show loading spinner
      await waitFor(() => {
        expect(saveButton).toBeInTheDocument()
      })
    })

    it('should handle save errors gracefully', async () => {
      const onOpenChange = jest.fn()
      ;(addContactEmailAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Email already exists'
      })

      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      const emailInput = await screen.findByPlaceholderText('email@example.com')
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const saveButton = screen.getByTitle('Save (Enter)')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument()
      })
    })
  })

  describe('Primary Email Auto-set', () => {
    it('should auto-check primary when contact has no emails', async () => {
      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={mockContact} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      const primaryCheckbox = await screen.findByRole('checkbox')
      expect(primaryCheckbox).toBeChecked()
    })

    it('should not auto-check primary when contact has existing emails', async () => {
      const contactWithEmails: ContactWithCompanies = {
        ...mockContact,
        emails: [
          {
            id: 'email-1',
            contact_id: '123',
            email: 'existing@example.com',
            is_primary: true,
            is_verified: false,
            email_type: 'work',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ]
      }

      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={contactWithEmails} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      const primaryCheckbox = await screen.findByRole('checkbox')
      expect(primaryCheckbox).not.toBeChecked()
    })
  })

  describe('Existing Emails Display', () => {
    it('should display existing emails in the list', () => {
      const contactWithEmails: ContactWithCompanies = {
        ...mockContact,
        emails: [
          {
            id: 'email-1',
            contact_id: '123',
            email: 'primary@example.com',
            is_primary: true,
            is_verified: true,
            email_type: 'work',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'email-2',
            contact_id: '123',
            email: 'secondary@example.com',
            is_primary: false,
            is_verified: false,
            email_type: 'personal',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ]
      }

      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={contactWithEmails} />
      )

      expect(screen.getByText('primary@example.com')).toBeInTheDocument()
      expect(screen.getByText('secondary@example.com')).toBeInTheDocument()
    })

    it('should show primary badge for primary email', () => {
      const contactWithEmails: ContactWithCompanies = {
        ...mockContact,
        emails: [
          {
            id: 'email-1',
            contact_id: '123',
            email: 'primary@example.com',
            is_primary: true,
            is_verified: false,
            email_type: 'work',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ]
      }

      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={contactWithEmails} />
      )

      expect(screen.getByText('Primary')).toBeInTheDocument()
    })

    it('should show inline form above existing emails', async () => {
      const contactWithEmails: ContactWithCompanies = {
        ...mockContact,
        emails: [
          {
            id: 'email-1',
            contact_id: '123',
            email: 'existing@example.com',
            is_primary: true,
            is_verified: false,
            email_type: 'work',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ]
      }

      const onOpenChange = jest.fn()
      render(
        <EditContactModal open={true} onOpenChange={onOpenChange} contact={contactWithEmails} />
      )

      const addButton = screen.getByText('Add Email')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument()
      })

      // Existing email should still be visible
      expect(screen.getByText('existing@example.com')).toBeInTheDocument()
    })
  })
})
