package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/textarea"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/firfircelik/platypus-cli/internal/i18n"
)

type Message struct {
	Role    string
	Content string
}

type Model struct {
	viewport viewport.Model
	textarea textarea.Model
	messages []Message
	ready    bool
	working  bool
	width    int
	height   int

	provider  string
	model     string
	inputTok  int
	outputTok int
	lang      i18n.Language
}

var (
	userStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#00FF00")).
			Bold(true).
			Padding(0, 0, 0, 2)

	asstStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#FFFFFF")).
			Padding(0, 0, 0, 2)

	toolStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#888888")).
			Padding(0, 0, 0, 4)

	statusStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#666666")).
			Padding(0, 1)

	workingStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#FFB800")).
			Padding(0, 1)
)

func NewModel(provider, model string, lang i18n.Language) Model {
	ta := textarea.New()
	ta.Placeholder = i18n.Get(lang).TypeMessage
	ta.ShowLineNumbers = false
	ta.Prompt = ""
	ta.FocusedStyle.Placeholder = lipgloss.NewStyle().Foreground(lipgloss.Color("#666666"))
	ta.FocusedStyle.Base = lipgloss.NewStyle().Border(lipgloss.NormalBorder(), false, false, true, false).BorderStyle(lipgloss.Border{Left: "│"}).Padding(0, 1)
	ta.CharLimit = 10000
	ta.SetWidth(80)
	ta.SetHeight(2)

	vp := viewport.New(80, 20)

	return Model{
		textarea: ta,
		viewport: vp,
		provider: provider,
		model:    model,
		lang:     lang,
	}
}

func (m Model) Init() tea.Cmd {
	return tea.Batch(
		tea.WindowSize(),
		textarea.Blink,
	)
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height

		if !m.ready {
			m.ready = true
			m.viewport.Width = msg.Width
			m.viewport.Height = msg.Height - 5
		} else {
			m.viewport.Width = msg.Width
			m.viewport.Height = msg.Height - 5
		}

		m.textarea.SetWidth(msg.Width - 4)
		return m, nil

	case tea.KeyMsg:
		if msg.Type == tea.KeyCtrlD {
			input := strings.TrimSpace(m.textarea.Value())
			if input != "" && !m.working {
				m.messages = append(m.messages, Message{Role: "user", Content: input})
				m.textarea.SetValue("")
				m.working = true
				m.viewport.SetContent(m.renderMessages())
				m.viewport.GotoBottom()
			}
			return m, tea.Batch(cmds...)
		}

		if msg.Type == tea.KeyEsc {
			return m, tea.Quit
		}

	case responseMsg:
		m.messages = append(m.messages, Message{Role: "assistant", Content: msg.Content})
		m.working = false
		m.inputTok = msg.InputTokens
		m.outputTok = msg.OutputTokens
		m.viewport.SetContent(m.renderMessages())
		m.viewport.GotoBottom()
		return m, nil

	case toolMsg:
		m.messages = append(m.messages, Message{Role: "tool", Content: fmt.Sprintf("✓ %s → %s", msg.Name, msg.Result)})
		m.viewport.SetContent(m.renderMessages())
		m.viewport.GotoBottom()
		return m, nil

	case errorMsg:
		m.messages = append(m.messages, Message{Role: "assistant", Content: fmt.Sprintf("Error: %s", msg.Err)})
		m.working = false
		m.viewport.SetContent(m.renderMessages())
		m.viewport.GotoBottom()
		return m, nil
	}

	m.viewport, cmd = m.viewport.Update(msg)
	cmds = append(cmds, cmd)

	m.textarea, cmd = m.textarea.Update(msg)
	cmds = append(cmds, cmd)

	return m, tea.Batch(cmds...)
}

func (m Model) View() string {
	if !m.ready {
		return i18n.Get(m.lang).Initializing
	}

	status := m.renderStatusBar()
	input := m.textarea.View()

	return lipgloss.JoinVertical(
		lipgloss.Left,
		m.viewport.View(),
		status,
		input,
	)
}

func (m Model) renderMessages() string {
	var sb strings.Builder

	for _, msg := range m.messages {
		switch msg.Role {
		case "user":
			sb.WriteString(userStyle.Render("> " + msg.Content))
			sb.WriteString("\n\n")
		case "assistant":
			sb.WriteString(asstStyle.Render(msg.Content))
			sb.WriteString("\n\n")
		case "tool":
			sb.WriteString(toolStyle.Render(msg.Content))
			sb.WriteString("\n")
		}
	}

	if m.working {
		sb.WriteString(workingStyle.Render("⠋ " + i18n.Get(m.lang).Working))
		sb.WriteString("\n")
	}

	return sb.String()
}

func (m Model) renderStatusBar() string {
	working := ""
	if m.working {
		working = workingStyle.Render("⠋ " + i18n.Get(m.lang).Working)
	}

	tokens := ""
	if m.inputTok > 0 || m.outputTok > 0 {
		tokens = statusStyle.Render(fmt.Sprintf(i18n.Get(m.lang).Tokens, m.inputTok, m.outputTok))
	}

	model := statusStyle.Render(fmt.Sprintf("%s / %s", m.provider, m.model))

	return lipgloss.JoinHorizontal(
		lipgloss.Left,
		model,
		tokens,
		working,
	)
}

type responseMsg struct {
	Content      string
	InputTokens  int
	OutputTokens int
}

type toolMsg struct {
	Name   string
	Result string
}

type errorMsg struct {
	Err string
}
