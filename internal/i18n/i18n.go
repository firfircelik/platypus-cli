package i18n

type Language string

const (
	English Language = "en"
	Turkish Language = "tr"
	German  Language = "de"
	Italian Language = "it"
	Spanish Language = "es"
)

var ValidLanguages = []Language{English, Turkish, German, Italian, Spanish}

type Translation struct {
	Working          string
	Tokens           string
	TypeMessage      string
	Initializing     string
	Usage            string
	Example          string
	APIError         string
	Compaction       string
	CompactionMsg    string
	PlanModeReminder string
	PlanModeExited   string
	ProviderFailed   string
	ProviderSwitched string
	PermissionDenied string
	UnknownTool      string
	UnknownProvider  string
	ConfigError      string
	AgentError       string
	EnterPlanMode    string
	ExitPlanMode     string
	PlanModeActive   string
}

var translations = map[Language]Translation{
	English: {
		Working:          "Working...",
		Tokens:           "Tokens: %d in / %d out",
		TypeMessage:      "Type a message... (Ctrl+D to send, Esc to quit)",
		Initializing:     "\n  Initializing...",
		Usage:            "Usage: platypus <prompt>",
		Example:          "Example: platypus 'refactor main.go to use interfaces'",
		APIError:         "API error (all providers failed): %w",
		Compaction:       "compaction",
		CompactionMsg:    "context compacted",
		PlanModeReminder: "Plan mode is active. You MUST NOT make any edits, run any non-readonly tools, or otherwise make any changes to the system. Only read files and write the plan file.",
		PlanModeExited:   "plan mode exited, restored to %s",
		ProviderFailed:   "[provider] %s failed: %v",
		ProviderSwitched: "[provider] switched to %s",
		PermissionDenied: "Permission denied: %s",
		UnknownTool:      "Unknown tool: %s",
		UnknownProvider:  "unknown provider: %s",
		ConfigError:      "config error: %w",
		AgentError:       "agent error: %w",
		EnterPlanMode:    "plan mode",
		ExitPlanMode:     "exit plan mode",
		PlanModeActive:   "Plan mode active",
	},
	Turkish: {
		Working:          "Çalışıyor...",
		Tokens:           "Token: %d giren / %d çıkan",
		TypeMessage:      "Mesaj yazın... (Göndermek için Ctrl+D, çıkmak için Esc)",
		Initializing:     "\n  Başlatılıyor...",
		Usage:            "Kullanım: platypus <komut>",
		Example:          "Örnek: platypus 'main.go dosyasını interface kullanacak şekilde yeniden düzenle'",
		APIError:         "API hatası (tüm sağlayıcılar başarısız): %w",
		Compaction:       "sıkıştırma",
		CompactionMsg:    "bağlam sıkıştırıldı",
		PlanModeReminder: "Plan modu aktif. Düzenleme yapmamalı, salt okunur olmayan araçları çalıştırmamalı veya sistemde herhangi bir değişiklik yapmamalısınız. Sadece dosyaları okuyun ve plan dosyasına yazın.",
		PlanModeExited:   "plan modundan çıkıldı, %s moduna geri dönüldü",
		ProviderFailed:   "[sağlayıcı] %s başarısız: %v",
		ProviderSwitched: "[sağlayıcı] %s sağlayıcısına geçildi",
		PermissionDenied: "İzin reddedildi: %s",
		UnknownTool:      "Bilinmeyen araç: %s",
		UnknownProvider:  "bilinmeyen sağlayıcı: %s",
		ConfigError:      "yapılandırma hatası: %w",
		AgentError:       "ajan hatası: %w",
		EnterPlanMode:    "plan moduna gir",
		ExitPlanMode:     "plan modundan çık",
		PlanModeActive:   "Plan modu aktif",
	},
	German: {
		Working:          "Arbeitet...",
		Tokens:           "Tokens: %d rein / %d raus",
		TypeMessage:      "Nachricht eingeben... (Ctrl+D zum Senden, Esc zum Beenden)",
		Initializing:     "\n  Initialisierung...",
		Usage:            "Verwendung: platypus <prompt>",
		Example:          "Beispiel: platypus 'main.go auf Interfaces umstellen'",
		APIError:         "API-Fehler (alle Anbieter fehlgeschlagen): %w",
		Compaction:       "Komprimierung",
		CompactionMsg:    "Kontext komprimiert",
		PlanModeReminder: "Planmodus ist aktiv. Sie dürfen KEINE Bearbeitungen vornehmen, KEINE nicht-schreibgeschützten Tools ausführen oder sonstige Änderungen am System vornehmen. Nur Dateien lesen und die Plandatei schreiben.",
		PlanModeExited:   "Planmodus beendet, zurück zu %s",
		ProviderFailed:   "[Anbieter] %s fehlgeschlagen: %v",
		ProviderSwitched: "[Anbieter] zu %s gewechselt",
		PermissionDenied: "Berechtigung verweigert: %s",
		UnknownTool:      "Unbekanntes Tool: %s",
		UnknownProvider:  "unbekannter Anbieter: %s",
		ConfigError:      "Konfigurationsfehler: %w",
		AgentError:       "Agent-Fehler: %w",
		EnterPlanMode:    "Planmodus aktivieren",
		ExitPlanMode:     "Planmodus verlassen",
		PlanModeActive:   "Planmodus aktiv",
	},
	Italian: {
		Working:          "In lavorazione...",
		Tokens:           "Token: %d in entrata / %d in uscita",
		TypeMessage:      "Scrivi un messaggio... (Ctrl+D per inviare, Esc per uscire)",
		Initializing:     "\n  Inizializzazione...",
		Usage:            "Utilizzo: platypus <prompt>",
		Example:          "Esempio: platypus 'rifattorizza main.go per usare interfacce'",
		APIError:         "Errore API (tutti i provider falliti): %w",
		Compaction:       "compattazione",
		CompactionMsg:    "contesto compattato",
		PlanModeReminder: "Modalità piano attiva. NON devi effettuare modifiche, eseguire strumenti non di sola lettura o apportare modifiche al sistema. Leggi solo i file e scrivi il file del piano.",
		PlanModeExited:   "uscita dalla modalità piano, ripristinato a %s",
		ProviderFailed:   "[provider] %s fallito: %v",
		ProviderSwitched: "[provider] passato a %s",
		PermissionDenied: "Permesso negato: %s",
		UnknownTool:      "Strumento sconosciuto: %s",
		UnknownProvider:  "provider sconosciuto: %s",
		ConfigError:      "errore di configurazione: %w",
		AgentError:       "errore agente: %w",
		EnterPlanMode:    "entra in modalità piano",
		ExitPlanMode:     "esci dalla modalità piano",
		PlanModeActive:   "Modalità piano attiva",
	},
	Spanish: {
		Working:          "Trabajando...",
		Tokens:           "Tokens: %d entrada / %d salida",
		TypeMessage:      "Escribe un mensaje... (Ctrl+D para enviar, Esc para salir)",
		Initializing:     "\n  Inicializando...",
		Usage:            "Uso: platypus <prompt>",
		Example:          "Ejemplo: platypus 'refactoriza main.go para usar interfaces'",
		APIError:         "Error de API (todos los proveedores fallaron): %w",
		Compaction:       "compresión",
		CompactionMsg:    "contexto comprimido",
		PlanModeReminder: "Modo plan activo. NO debes realizar ninguna edición, ejecutar herramientas que no sean de solo lectura ni realizar cambios en el sistema. Solo lee archivos y escribe el archivo de plan.",
		PlanModeExited:   "salida del modo plan, restaurado a %s",
		ProviderFailed:   "[proveedor] %s falló: %v",
		ProviderSwitched: "[proveedor] cambiado a %s",
		PermissionDenied: "Permiso denegado: %s",
		UnknownTool:      "Herramienta desconocida: %s",
		UnknownProvider:  "proveedor desconocido: %s",
		ConfigError:      "error de configuración: %w",
		AgentError:       "error de agente: %w",
		EnterPlanMode:    "entrar en modo plan",
		ExitPlanMode:     "salir del modo plan",
		PlanModeActive:   "Modo plan activo",
	},
}

func Get(lang Language) Translation {
	if t, ok := translations[lang]; ok {
		return t
	}
	return translations[English]
}

func ParseLanguage(s string) Language {
	switch s {
	case "en", "english":
		return English
	case "tr", "turkish", "türkçe":
		return Turkish
	case "de", "german", "almanca":
		return German
	case "it", "italian", "italyanca":
		return Italian
	case "es", "spanish", "ispanyolca":
		return Spanish
	default:
		return English
	}
}

func LanguageName(lang Language) string {
	switch lang {
	case English:
		return "English"
	case Turkish:
		return "Türkçe"
	case German:
		return "Deutsch"
	case Italian:
		return "Italiano"
	case Spanish:
		return "Español"
	default:
		return "English"
	}
}
