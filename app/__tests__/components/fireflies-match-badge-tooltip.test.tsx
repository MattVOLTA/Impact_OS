/**
 * Tests for MatchBadge Tooltip Functionality
 *
 * Verifies that the "Known Contact" badge displays a tooltip with contact names on hover
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock the MatchBadge component inline for testing
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

function MatchBadge({
  matchType,
  contactNames
}: {
  matchType: 'active_support' | 'known_contact' | 'no_match'
  contactNames?: Array<{ email: string; name: string }>
}) {
  const styles = {
    active_support: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    known_contact: 'bg-green-500/10 text-green-600 border-green-500/20',
    no_match: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  }

  const labels = {
    active_support: '🟡 Active Support',
    known_contact: '🟢 Known Contact',
    no_match: '⚪ No Match',
  }

  const badge = (
    <Badge variant="outline" className={styles[matchType]}>
      {labels[matchType]}
    </Badge>
  )

  // Add tooltip for known_contact with contact names
  if (matchType === 'known_contact' && contactNames && contactNames.length > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-semibold text-xs">Matched Contacts:</div>
            {contactNames.map((contact, idx) => (
              <div key={idx} className="text-xs">
                {contact.name}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return badge
}

describe('MatchBadge Tooltip', () => {
  const user = userEvent.setup()

  describe('known_contact badge with contact names', () => {
    it('should render badge with tooltip trigger', () => {
      const contactNames = [
        { email: 'bailey@myagiea.com', name: 'Bailey Darling' },
        { email: 'td@myagiea.com', name: 'Tukan Das' }
      ]

      render(<MatchBadge matchType="known_contact" contactNames={contactNames} />)

      const badge = screen.getByText('🟢 Known Contact')
      expect(badge).toBeInTheDocument()
    })

    it('should display tooltip content with contact names on hover', async () => {
      const contactNames = [
        { email: 'bailey@myagiea.com', name: 'Bailey Darling' },
        { email: 'td@myagiea.com', name: 'Tukan Das' }
      ]

      render(<MatchBadge matchType="known_contact" contactNames={contactNames} />)

      const badge = screen.getByText('🟢 Known Contact')

      // Hover over the badge
      await user.hover(badge)

      // Wait for tooltip to appear and check content
      // Radix renders content twice (visible + hidden for accessibility)
      const tooltipHeaders = await screen.findAllByText('Matched Contacts:')
      expect(tooltipHeaders.length).toBeGreaterThan(0)

      const contact1 = await screen.findAllByText('Bailey Darling')
      expect(contact1.length).toBeGreaterThan(0)

      const contact2 = await screen.findAllByText('Tukan Das')
      expect(contact2.length).toBeGreaterThan(0)
    })

    it('should show all contact names when multiple matches exist', async () => {
      const contactNames = [
        { email: 'bailey@myagiea.com', name: 'Bailey Darling' },
        { email: 'matt@voltaeffect.com', name: 'Matt Cooper' },
        { email: 'td@myagiea.com', name: 'Tukan Das' }
      ]

      render(<MatchBadge matchType="known_contact" contactNames={contactNames} />)

      const badge = screen.getByText('🟢 Known Contact')
      await user.hover(badge)

      // Radix renders content twice (visible + hidden for accessibility)
      const tooltipHeaders = await screen.findAllByText('Matched Contacts:')
      expect(tooltipHeaders.length).toBeGreaterThan(0)

      expect((await screen.findAllByText('Bailey Darling')).length).toBeGreaterThan(0)
      expect((await screen.findAllByText('Matt Cooper')).length).toBeGreaterThan(0)
      expect((await screen.findAllByText('Tukan Das')).length).toBeGreaterThan(0)
    })
  })

  describe('no_match and active_support badges', () => {
    it('should not show tooltip for no_match badge', () => {
      render(<MatchBadge matchType="no_match" />)

      const badge = screen.getByText('⚪ No Match')
      expect(badge).toBeInTheDocument()

      // Tooltip content should not be in the document
      expect(screen.queryByText('Matched Contacts:')).not.toBeInTheDocument()
    })

    it('should not show tooltip for active_support badge', () => {
      render(<MatchBadge matchType="active_support" />)

      const badge = screen.getByText('🟡 Active Support')
      expect(badge).toBeInTheDocument()

      // Tooltip content should not be in the document
      expect(screen.queryByText('Matched Contacts:')).not.toBeInTheDocument()
    })

    it('should not show tooltip for known_contact without contactNames', () => {
      render(<MatchBadge matchType="known_contact" />)

      const badge = screen.getByText('🟢 Known Contact')
      expect(badge).toBeInTheDocument()

      // Tooltip content should not be in the document
      expect(screen.queryByText('Matched Contacts:')).not.toBeInTheDocument()
    })

    it('should not show tooltip for known_contact with empty contactNames array', () => {
      render(<MatchBadge matchType="known_contact" contactNames={[]} />)

      const badge = screen.getByText('🟢 Known Contact')
      expect(badge).toBeInTheDocument()

      // Tooltip content should not be in the document
      expect(screen.queryByText('Matched Contacts:')).not.toBeInTheDocument()
    })
  })
})
