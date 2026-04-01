package main

import (
	"fmt"
	"os"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/firfircelik/platypus-cli/internal/agent"
	"github.com/firfircelik/platypus-cli/internal/config"
	"github.com/firfircelik/platypus-cli/internal/i18n"
	"github.com/firfircelik/platypus-cli/internal/lsp"
	"github.com/firfircelik/platypus-cli/internal/tui"
	"github.com/firfircelik/platypus-cli/pkg/platypus"

	"github.com/spf13/cobra"
)

var banner = "" +
	"      .--..-'''-''''-._            \n" +
	"  ___/%   ) )      \\ i-;;,_        \n" +
	"((:___/--/ /--------\\ ) `'-'       \n" +
	"         \"\"          \"\"            \n"

var (
	provider    string
	model       string
	verbose     bool
	apiKey      string
	interactive bool
	useTUI      bool
	lspMode     bool
	lang        string
)

var rootCmd = &cobra.Command{
	Use:   "platypus",
	Short: "AI coding agent — iş yap, konuşma",
	Long: banner + `
Platypus: Minimum token, maksimum doğruluk.

Varsayılan mod: sessiz, hızlı, doğrulanmış.
--verbose ile açıklamalı mod.
Argüman yoksa interaktif REPL modu başlar.`,
	Version: platypus.Version,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := config.Load()
		if err != nil {
			t := i18n.Get(cfg.Language)
			return fmt.Errorf(t.ConfigError, err)
		}

		if provider != "" {
			cfg.Provider = provider
		}
		if model != "" {
			cfg.Model = model
		}
		if verbose {
			cfg.Verbose = true
		}
		if apiKey != "" {
			cfg.APIKey = apiKey
		}
		if lang != "" {
			cfg.Language = i18n.ParseLanguage(lang)
		}

		a, err := agent.New(cfg)
		if err != nil {
			t := i18n.Get(cfg.Language)
			return fmt.Errorf(t.AgentError, err)
		}

		if lspMode {
			srv := lsp.NewServer()
			return srv.Run(cmd.Context())
		}

		if interactive || len(args) == 0 {
			if useTUI {
				p := tea.NewProgram(tui.NewModel(cfg.Provider, cfg.Model, cfg.Language), tea.WithAltScreen())
				_, err := p.Run()
				return err
			}
			return a.RunInteractive(cmd.Context())
		}

		return a.Run(cmd.Context(), args)
	},
}

func init() {
	rootCmd.Flags().StringVarP(&provider, "provider", "p", "", "AI provider (anthropic, openai, ollama)")
	rootCmd.Flags().StringVarP(&model, "model", "m", "", "Model name")
	rootCmd.Flags().StringVarP(&apiKey, "api-key", "k", "", "API key")
	rootCmd.Flags().BoolVarP(&verbose, "verbose", "v", false, "Verbose mode (açıklamalı)")
	rootCmd.Flags().BoolVarP(&interactive, "interactive", "i", false, "Interactive REPL mode")
	rootCmd.Flags().BoolVarP(&useTUI, "tui", "t", false, "Full TUI mode (Bubbletea)")
	rootCmd.Flags().BoolVar(&lspMode, "lsp", false, "LSP server mode (for VS Code)")
	rootCmd.Flags().StringVarP(&lang, "lang", "l", "", "Language (en, tr, de, it, es)")
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
