package lsp

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
)

type Server struct {
	reader *bufio.Reader
	writer io.Writer
}

type Request struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int             `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params"`
}

type Response struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      int         `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   *Error      `json:"error,omitempty"`
}

type Error struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type InitializeParams struct {
	Capabilities Capabilities `json:"capabilities"`
}

type Capabilities struct {
	TextDocument TextDocumentClientCapabilities `json:"textDocument"`
}

type TextDocumentClientCapabilities struct {
	Completion CompletionClientCapabilities `json:"completion"`
}

type CompletionClientCapabilities struct {
	CompletionItem CompletionItemCapabilities `json:"completionItem"`
}

type CompletionItemCapabilities struct {
	SnippetSupport bool `json:"snippetSupport"`
}

type ServerCapabilities struct {
	TextDocumentSync   int                 `json:"textDocumentSync"`
	CompletionProvider *CompletionProvider `json:"completionProvider,omitempty"`
}

type CompletionProvider struct {
	TriggerCharacters []string `json:"triggerCharacters"`
}

type CompletionParams struct {
	TextDocument TextDocumentIdentifier `json:"textDocument"`
	Position     Position               `json:"position"`
}

type TextDocumentIdentifier struct {
	URI string `json:"uri"`
}

type Position struct {
	Line      int `json:"line"`
	Character int `json:"character"`
}

type CompletionItem struct {
	Label      string `json:"label"`
	Kind       int    `json:"kind"`
	Detail     string `json:"detail,omitempty"`
	InsertText string `json:"insertText,omitempty"`
}

func NewServer() *Server {
	return &Server{
		reader: bufio.NewReader(os.Stdin),
		writer: os.Stdout,
	}
}

func (s *Server) Run(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		req, err := s.readRequest()
		if err != nil {
			if err == io.EOF {
				return nil
			}
			return err
		}

		resp := s.handleRequest(req)
		if resp != nil {
			if err := s.writeResponse(resp); err != nil {
				return err
			}
		}
	}
}

func (s *Server) readRequest() (*Request, error) {
	var contentLength int

	for {
		line, err := s.reader.ReadString('\n')
		if err != nil {
			return nil, err
		}

		line = strings.TrimSpace(line)
		if line == "" {
			break
		}

		if strings.HasPrefix(line, "Content-Length: ") {
			contentLength, err = strconv.Atoi(strings.TrimPrefix(line, "Content-Length: "))
			if err != nil {
				return nil, fmt.Errorf("invalid content length: %w", err)
			}
		}
	}

	if contentLength == 0 {
		return nil, fmt.Errorf("no content length")
	}

	body := make([]byte, contentLength)
	if _, err := io.ReadFull(s.reader, body); err != nil {
		return nil, err
	}

	var req Request
	if err := json.Unmarshal(body, &req); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}

	return &req, nil
}

func (s *Server) writeResponse(resp *Response) error {
	body, err := json.Marshal(resp)
	if err != nil {
		return err
	}

	header := fmt.Sprintf("Content-Length: %d\r\n\r\n", len(body))
	if _, err := s.writer.Write([]byte(header)); err != nil {
		return err
	}
	if _, err := s.writer.Write(body); err != nil {
		return err
	}

	return nil
}

func (s *Server) handleRequest(req *Request) *Response {
	switch req.Method {
	case "initialize":
		return s.handleInitialize(req)
	case "initialized":
		return nil
	case "shutdown":
		return &Response{JSONRPC: "2.0", ID: req.ID, Result: nil}
	case "exit":
		os.Exit(0)
		return nil
	case "textDocument/completion":
		return s.handleCompletion(req)
	default:
		return &Response{
			JSONRPC: "2.0",
			ID:      req.ID,
			Result:  nil,
		}
	}
}

func (s *Server) handleInitialize(req *Request) *Response {
	return &Response{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result: map[string]interface{}{
			"capabilities": ServerCapabilities{
				TextDocumentSync: 1,
				CompletionProvider: &CompletionProvider{
					TriggerCharacters: []string{"/", "@"},
				},
			},
		},
	}
}

func (s *Server) handleCompletion(req *Request) *Response {
	var params CompletionParams
	if err := json.Unmarshal(req.Params, &params); err != nil {
		return &Response{
			JSONRPC: "2.0",
			ID:      req.ID,
			Error:   &Error{Code: -32602, Message: "Invalid params"},
		}
	}

	items := []CompletionItem{
		{
			Label:      "platypus:ask",
			Kind:       1,
			Detail:     "Ask Platypus a question",
			InsertText: "/ask ",
		},
		{
			Label:      "platypus:edit",
			Kind:       1,
			Detail:     "Edit code with Platypus",
			InsertText: "/edit ",
		},
		{
			Label:      "platypus:explain",
			Kind:       1,
			Detail:     "Explain selected code",
			InsertText: "/explain ",
		},
	}

	return &Response{
		JSONRPC: "2.0",
		ID:      req.ID,
		Result:  items,
	}
}
