package config

import (
	"os"

	"github.com/firfircelik/platypus-cli/internal/i18n"
	"github.com/spf13/viper"
)

type Config struct {
	Provider string
	Model    string
	APIKey   string
	Verbose  bool
	Security string
	Language i18n.Language
}

func Load() (*Config, error) {
	v := viper.New()
	v.SetConfigName("platypus")
	v.SetConfigType("toml")
	v.AddConfigPath(".")
	v.AddConfigPath(os.ExpandEnv("$HOME/.platypus"))

	v.SetDefault("providers.default.provider", "anthropic")
	v.SetDefault("providers.default.model", "claude-sonnet-4-6")
	v.SetDefault("security.mode", "permissive")
	v.SetDefault("ui.verbose", false)
	v.SetDefault("i18n.language", "en")

	_ = v.ReadInConfig()

	cfg := &Config{
		Provider: v.GetString("providers.default.provider"),
		Model:    v.GetString("providers.default.model"),
		Verbose:  v.GetBool("ui.verbose"),
		Security: v.GetString("security.mode"),
		Language: i18n.ParseLanguage(v.GetString("i18n.language")),
	}

	cfg.APIKey = os.Getenv("ANTHROPIC_API_KEY")
	if cfg.APIKey == "" {
		cfg.APIKey = os.Getenv("OPENAI_API_KEY")
	}

	return cfg, nil
}
