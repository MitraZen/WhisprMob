import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NetworkDebugger } from '../NetworkDebugger';

// Mock fetch
global.fetch = jest.fn();

describe('NetworkDebugger', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render network debugger component', () => {
    const { getByText } = render(<NetworkDebugger />);
    
    expect(getByText('Network Debugger')).toBeTruthy();
    expect(getByText('Run Network Tests')).toBeTruthy();
    expect(getByText('Clear Results')).toBeTruthy();
  });

  it('should run network tests and display success results', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

    const { getByText } = render(<NetworkDebugger />);
    
    fireEvent.press(getByText('Run Network Tests'));

    await waitFor(() => {
      expect(getByText(/Test 1 PASSED/)).toBeTruthy();
    });
  });

  it('should handle network test failures', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { getByText } = render(<NetworkDebugger />);
    
    fireEvent.press(getByText('Run Network Tests'));

    await waitFor(() => {
      expect(getByText(/Test 1 ERROR/)).toBeTruthy();
    });
  });

  it('should clear test results when clear button is pressed', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { getByText, queryByText } = render(<NetworkDebugger />);
    
    // Run tests first
    fireEvent.press(getByText('Run Network Tests'));

    await waitFor(() => {
      expect(getByText(/Test 1 ERROR/)).toBeTruthy();
    });

    // Clear results
    fireEvent.press(getByText('Clear Results'));

    await waitFor(() => {
      expect(queryByText(/Test 1 ERROR/)).toBeNull();
    });
  });

  it('should show loading state during tests', async () => {
    // Mock a slow response
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100))
    );

    const { getByText } = render(<NetworkDebugger />);
    
    fireEvent.press(getByText('Run Network Tests'));

    // Should show loading state
    expect(getByText('Testing...')).toBeTruthy();
  });

  it('should handle HTTP error responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { getByText } = render(<NetworkDebugger />);
    
    fireEvent.press(getByText('Run Network Tests'));

    await waitFor(() => {
      expect(getByText(/Test 1 FAILED/)).toBeTruthy();
    });
  });

  it('should test multiple endpoints', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ 
        ok: true, 
        status: 200, 
        json: () => Promise.resolve([]) 
      })
      .mockResolvedValueOnce({ 
        ok: true, 
        status: 200, 
        json: () => Promise.resolve([]) 
      });

    const { getByText } = render(<NetworkDebugger />);
    
    fireEvent.press(getByText('Run Network Tests'));

    await waitFor(() => {
      expect(getByText(/Test 1 PASSED/)).toBeTruthy();
      expect(getByText(/Test 2 PASSED/)).toBeTruthy();
      expect(getByText(/Test 3 PASSED/)).toBeTruthy();
    });
  });
});
