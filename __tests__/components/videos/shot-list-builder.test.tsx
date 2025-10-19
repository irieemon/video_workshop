import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShotListBuilder } from '@/components/videos/shot-list-builder'
import { Shot } from '@/lib/types/database.types'

describe('ShotListBuilder', () => {
  const mockOnChange = jest.fn()
  const mockOnAISuggest = jest.fn()

  const defaultShots: Shot[] = [
    {
      timing: '0-4s',
      description: 'Opening shot of product',
      camera: 'Wide angle',
      order: 1,
      lighting: 'Natural',
      notes: 'Keep it bright',
    },
    {
      timing: '4-8s',
      description: 'Close-up of features',
      camera: 'Macro',
      order: 2,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders shot list correctly', () => {
    render(
      <ShotListBuilder
        shots={defaultShots}
        onChange={mockOnChange}
        onAISuggest={mockOnAISuggest}
      />
    )

    expect(screen.getByText('Shot List Builder')).toBeInTheDocument()
    expect(screen.getByText(/Shot 1 \(0-4s\)/)).toBeInTheDocument()
    expect(screen.getByText(/Shot 2 \(4-8s\)/)).toBeInTheDocument()
  })

  it('displays empty state when no shots', () => {
    render(
      <ShotListBuilder
        shots={[]}
        onChange={mockOnChange}
        onAISuggest={mockOnAISuggest}
      />
    )

    expect(screen.getByText(/No shots yet/i)).toBeInTheDocument()
  })

  it('adds a new shot when Add Shot button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <ShotListBuilder
        shots={defaultShots}
        onChange={mockOnChange}
        onAISuggest={mockOnAISuggest}
      />
    )

    const addButton = screen.getByText('Add Shot')
    await user.click(addButton)

    expect(mockOnChange).toHaveBeenCalledWith([
      ...defaultShots,
      {
        timing: '8-12s',
        description: '',
        camera: '',
        order: 3,
      },
    ])
  })

  it('removes a shot when delete button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <ShotListBuilder
        shots={defaultShots}
        onChange={mockOnChange}
        onAISuggest={mockOnAISuggest}
      />
    )

    const deleteButtons = screen.getAllByLabelText(/Delete shot/i)
    await user.click(deleteButtons[0])

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        ...defaultShots[1],
        order: 1, // Should be reordered
      },
    ])
  })

  it('moves shot up when up button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <ShotListBuilder
        shots={defaultShots}
        onChange={mockOnChange}
        onAISuggest={mockOnAISuggest}
      />
    )

    const upButtons = screen.getAllByLabelText(/Move up/i)
    await user.click(upButtons[1]) // Click up on second shot

    expect(mockOnChange).toHaveBeenCalledWith([
      { ...defaultShots[1], order: 1 },
      { ...defaultShots[0], order: 2 },
    ])
  })

  it('moves shot down when down button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <ShotListBuilder
        shots={defaultShots}
        onChange={mockOnChange}
        onAISuggest={mockOnAISuggest}
      />
    )

    const downButtons = screen.getAllByLabelText(/Move down/i)
    await user.click(downButtons[0]) // Click down on first shot

    expect(mockOnChange).toHaveBeenCalledWith([
      { ...defaultShots[1], order: 1 },
      { ...defaultShots[0], order: 2 },
    ])
  })

  it('updates shot fields when user types', async () => {
    const user = userEvent.setup()

    render(
      <ShotListBuilder
        shots={defaultShots}
        onChange={mockOnChange}
        onAISuggest={mockOnAISuggest}
      />
    )

    const descriptionInputs = screen.getAllByPlaceholderText(/Describe this shot/i)
    await user.clear(descriptionInputs[0])
    await user.type(descriptionInputs[0], 'New description')

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        ...defaultShots[0],
        description: 'New description',
      },
      defaultShots[1],
    ])
  })

  it('calls onAISuggest when AI Suggest Shots button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <ShotListBuilder
        shots={[]}
        onChange={mockOnChange}
        onAISuggest={mockOnAISuggest}
      />
    )

    const aiButton = screen.getByText('AI Suggest Shots')
    await user.click(aiButton)

    expect(mockOnAISuggest).toHaveBeenCalled()
  })

  it('disables move up button for first shot', () => {
    render(
      <ShotListBuilder
        shots={defaultShots}
        onChange={mockOnChange}
        onAISuggest={mockOnAISuggest}
      />
    )

    const upButtons = screen.getAllByLabelText(/Move up/i)
    expect(upButtons[0]).toBeDisabled()
    expect(upButtons[1]).not.toBeDisabled()
  })

  it('disables move down button for last shot', () => {
    render(
      <ShotListBuilder
        shots={defaultShots}
        onChange={mockOnChange}
        onAISuggest={mockOnAISuggest}
      />
    )

    const downButtons = screen.getAllByLabelText(/Move down/i)
    expect(downButtons[0]).not.toBeDisabled()
    expect(downButtons[1]).toBeDisabled()
  })

  it('renders optional fields correctly', () => {
    render(
      <ShotListBuilder
        shots={defaultShots}
        onChange={mockOnChange}
        onAISuggest={mockOnAISuggest}
      />
    )

    expect(screen.getAllByPlaceholderText(/Natural, studio, dramatic/i)).toHaveLength(2)
    expect(screen.getAllByPlaceholderText(/Additional notes/i)).toHaveLength(2)
  })
})
