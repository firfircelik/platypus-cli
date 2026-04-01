package mcp

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"sync"
)

type Client struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	stdout io.ReadCloser
	stderr io.ReadCloser
	mu     sync.Mutex
	nextID int
}

type MCPServer struct {
	Name    string
	Command string
	Args    []string
	Env     []string
}

type Tool struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	InputSchema map[string]any `json:"inputSchema"`
}

type Resource struct {
	URI         string `json:"uri"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

func NewClient(server MCPServer) (*Client, error) {
	cmd := exec.Command(server.Command, server.Args...)
	cmd.Env = append(cmd.Env, server.Env...)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, err
	}

	if err := cmd.Start(); err != nil {
		return nil, err
	}

	return &Client{
		cmd:    cmd,
		stdin:  stdin,
		stdout: stdout,
		stderr: stderr,
		nextID: 1,
	}, nil
}

func (c *Client) Close() error {
	c.stdin.Close()
	return c.cmd.Wait()
}

type jsonRPCRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Method  string `json:"method"`
	Params  any    `json:"params,omitempty"`
}

type jsonRPCResponse struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Result  any    `json:"result,omitempty"`
	Error   any    `json:"error,omitempty"`
}

func (c *Client) sendRequest(ctx context.Context, method string, params any) (any, error) {
	c.mu.Lock()
	id := c.nextID
	c.nextID++
	c.mu.Unlock()

	req := jsonRPCRequest{
		JSONRPC: "2.0",
		ID:      id,
		Method:  method,
		Params:  params,
	}

	data, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	if _, err := c.stdin.Write(append(data, '\n')); err != nil {
		return nil, err
	}

	reader := bufio.NewReader(c.stdout)
	for {
		line, err := reader.ReadBytes('\n')
		if err != nil {
			return nil, err
		}

		var resp jsonRPCResponse
		if err := json.Unmarshal(line, &resp); err != nil {
			continue
		}

		if resp.ID == id {
			if resp.Error != nil {
				return nil, fmt.Errorf("MCP error: %v", resp.Error)
			}
			return resp.Result, nil
		}
	}
}

func (c *Client) Initialize(ctx context.Context) error {
	_, err := c.sendRequest(ctx, "initialize", map[string]any{
		"protocolVersion": "2024-11-05",
		"capabilities":    map[string]any{},
		"clientInfo": map[string]string{
			"name":    "platypus",
			"version": "0.1.0",
		},
	})
	if err != nil {
		return err
	}

	_, err = c.sendRequest(ctx, "notifications/initialized", nil)
	return err
}

func (c *Client) ListTools(ctx context.Context) ([]Tool, error) {
	result, err := c.sendRequest(ctx, "tools/list", nil)
	if err != nil {
		return nil, err
	}

	data, _ := json.Marshal(result)
	var resp struct {
		Tools []Tool `json:"tools"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, err
	}

	return resp.Tools, nil
}

func (c *Client) CallTool(ctx context.Context, name string, args map[string]any) (string, error) {
	result, err := c.sendRequest(ctx, "tools/call", map[string]any{
		"name":      name,
		"arguments": args,
	})
	if err != nil {
		return "", err
	}

	data, _ := json.Marshal(result)
	var resp struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
		IsError bool `json:"isError"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return "", err
	}

	if resp.IsError {
		return "", fmt.Errorf("tool execution failed")
	}

	var output string
	for _, c := range resp.Content {
		if c.Type == "text" {
			output += c.Text
		}
	}

	return output, nil
}

func (c *Client) ListResources(ctx context.Context) ([]Resource, error) {
	result, err := c.sendRequest(ctx, "resources/list", nil)
	if err != nil {
		return nil, err
	}

	data, _ := json.Marshal(result)
	var resp struct {
		Resources []Resource `json:"resources"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, err
	}

	return resp.Resources, nil
}

func (c *Client) ReadResource(ctx context.Context, uri string) (string, error) {
	result, err := c.sendRequest(ctx, "resources/read", map[string]any{
		"uri": uri,
	})
	if err != nil {
		return "", err
	}

	data, _ := json.Marshal(result)
	var resp struct {
		Contents []struct {
			URI  string `json:"uri"`
			Text string `json:"text"`
		} `json:"contents"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return "", err
	}

	var output string
	for _, c := range resp.Contents {
		output += c.Text
	}

	return output, nil
}
