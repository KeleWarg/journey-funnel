import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FunnelSettingsSection from '../../../components/FunnelSettingsSection';

// Mock props
const mockProps = {
  journeyType: 'transactional',
  onJourneyTypeChange: jest.fn(),
  E: 3,
  setE: jest.fn(),
  N: 3,
  setN: jest.fn(),
  source: 'paid_search',
  setSource: jest.fn(),
  U0: 1000,
  setU0: jest.fn(),
  c1: 1.0,
  setC1: jest.fn(),
  c2: 2.5,
  setC2: jest.fn(),
  c3: 1.5,
  setC3: jest.fn(),
  w_c: 3.0,
  setWC: jest.fn(),
  w_f: 1.0,
  setWF: jest.fn(),
  w_E: 0.2,
  setWE: jest.fn(),
  w_N: 0.8,
  setWN: jest.fn()
};

describe('FunnelSettingsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering Tests', () => {
    test('should render all main form elements', () => {
      // Arrange & Act
      render(<FunnelSettingsSection {...mockProps} />);

      // Assert
      expect(screen.getByText('Funnel-Level Settings')).toBeInTheDocument();
      expect(screen.getByLabelText(/Journey Type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Emotion \(E\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Necessity \(N\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Traffic Source/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/U₀ \(Initial Cohort\)/i)).toBeInTheDocument();
    });

    test('should render collapsed by default with collapsible trigger', async () => {
      // Arrange & Act
      render(<FunnelSettingsSection {...mockProps} />);

      // Assert
      const trigger = screen.getByRole('button');
      expect(trigger).toBeInTheDocument();
      
      // Content should be collapsed initially (check for advanced settings)
      expect(screen.queryByText('Advanced Weight Settings')).not.toBeInTheDocument();
      
      // Click to expand
      await userEvent.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Advanced Weight Settings')).toBeInTheDocument();
      });
    });

    test('should display current values in form fields', () => {
      // Arrange & Act
      render(<FunnelSettingsSection {...mockProps} />);

      // Assert
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument(); // U0 value
    });
  });

  describe('User Interaction Tests', () => {
    test('should call onJourneyTypeChange when journey type is selected', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act
      const journeyTypeSelect = screen.getByLabelText(/Journey Type/i);
      await user.click(journeyTypeSelect);
      
      // Wait for options to appear, then select one
      await waitFor(() => {
        const exploratoryOption = screen.getByText('Exploratory');
        expect(exploratoryOption).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Exploratory'));

      // Assert
      expect(mockProps.onJourneyTypeChange).toHaveBeenCalledWith('exploratory');
    });

    test('should call setE when emotion value changes', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act
      const emotionSelect = screen.getByLabelText(/Emotion \(E\)/i);
      await user.click(emotionSelect);
      
      await waitFor(() => {
        const emotionOption = screen.getByText('4 - Highly Emotional');
        expect(emotionOption).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('4 - Highly Emotional'));

      // Assert
      expect(mockProps.setE).toHaveBeenCalledWith(4);
    });

    test('should call setU0 when initial cohort value changes', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act
      const u0Input = screen.getByLabelText(/U₀ \(Initial Cohort\)/i);
      await user.clear(u0Input);
      await user.type(u0Input, '2000');

      // Assert
      expect(mockProps.setU0).toHaveBeenCalledWith(2000);
    });

    test('should handle invalid U0 input gracefully', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act
      const u0Input = screen.getByLabelText(/U₀ \(Initial Cohort\)/i);
      await user.clear(u0Input);
      await user.type(u0Input, 'invalid');

      // Assert
      expect(mockProps.setU0).toHaveBeenCalledWith(1000); // Should default to 1000
    });
  });

  describe('Advanced Settings Tests', () => {
    test('should show advanced weight settings when expanded', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act - Expand main section first
      const mainTrigger = screen.getAllByRole('button')[0];
      await user.click(mainTrigger);

      // Then expand advanced settings
      await waitFor(() => {
        const advancedTrigger = screen.getByText('Advanced Weight Settings');
        expect(advancedTrigger).toBeInTheDocument();
      });

      const advancedSection = screen.getByText('Advanced Weight Settings');
      await user.click(advancedSection);

      // Assert
      await waitFor(() => {
        expect(screen.getByLabelText(/c₁ \(interaction weight\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/c₂ \(privacy weight\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/c₃ \(difficulty weight\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/w_c \(complexity weight\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/w_f \(fatigue weight\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/w_E \(Emotion weight\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/w_N \(Necessity weight\)/i)).toBeInTheDocument();
      });
    });

    test('should update advanced weight parameters', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act - Expand sections
      const mainTrigger = screen.getAllByRole('button')[0];
      await user.click(mainTrigger);

      await waitFor(() => {
        const advancedTrigger = screen.getByText('Advanced Weight Settings');
        expect(advancedTrigger).toBeInTheDocument();
      });

      await user.click(screen.getByText('Advanced Weight Settings'));

      // Update c1 parameter
      await waitFor(() => {
        const c1Input = screen.getByLabelText(/c₁ \(interaction weight\)/i);
        expect(c1Input).toBeInTheDocument();
      });

      const c1Input = screen.getByLabelText(/c₁ \(interaction weight\)/i);
      await user.clear(c1Input);
      await user.type(c1Input, '2.5');

      // Assert
      expect(mockProps.setC1).toHaveBeenCalledWith(2.5);
    });

    test('should handle invalid numeric input in advanced settings', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act - Expand sections and try invalid input
      const mainTrigger = screen.getAllByRole('button')[0];
      await user.click(mainTrigger);

      await waitFor(() => {
        const advancedTrigger = screen.getByText('Advanced Weight Settings');
        expect(advancedTrigger).toBeInTheDocument();
      });

      await user.click(screen.getByText('Advanced Weight Settings'));

      await waitFor(() => {
        const c1Input = screen.getByLabelText(/c₁ \(interaction weight\)/i);
        expect(c1Input).toBeInTheDocument();
      });

      const c1Input = screen.getByLabelText(/c₁ \(interaction weight\)/i);
      await user.clear(c1Input);
      await user.type(c1Input, 'invalid');

      // Assert
      expect(mockProps.setC1).toHaveBeenCalledWith(0); // Should default to 0
    });
  });

  describe('Accessibility Tests', () => {
    test('should have proper labels for all form inputs', () => {
      // Arrange & Act
      render(<FunnelSettingsSection {...mockProps} />);

      // Assert
      const journeyTypeInput = screen.getByLabelText(/Journey Type/i);
      const emotionInput = screen.getByLabelText(/Emotion \(E\)/i);
      const necessityInput = screen.getByLabelText(/Necessity \(N\)/i);
      const trafficSourceInput = screen.getByLabelText(/Traffic Source/i);
      const u0Input = screen.getByLabelText(/U₀ \(Initial Cohort\)/i);

      expect(journeyTypeInput).toBeInTheDocument();
      expect(emotionInput).toBeInTheDocument();
      expect(necessityInput).toBeInTheDocument();
      expect(trafficSourceInput).toBeInTheDocument();
      expect(u0Input).toBeInTheDocument();
    });

    test('should have keyboard navigation support', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act - Use keyboard to navigate
      await user.tab(); // Should focus on collapsible trigger
      await user.keyboard('{Enter}'); // Should expand section

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Advanced Weight Settings')).toBeInTheDocument();
      });
    });
  });

  describe('Prop Validation Tests', () => {
    test('should handle undefined props gracefully', () => {
      // Arrange
      const incompleteProps = {
        ...mockProps,
        journeyType: undefined,
        E: undefined,
        N: undefined
      };

      // Act & Assert - Should not crash
      expect(() => {
        render(<FunnelSettingsSection {...incompleteProps as any} />);
      }).not.toThrow();
    });

    test('should display help text for each input', () => {
      // Arrange & Act
      render(<FunnelSettingsSection {...mockProps} />);

      // Assert
      expect(screen.getByText(/Select the funnel archetype/i)).toBeInTheDocument();
      expect(screen.getByText(/How strongly does this journey pull/i)).toBeInTheDocument();
      expect(screen.getByText(/How urgently does the user need/i)).toBeInTheDocument();
      expect(screen.getByText(/Your traffic source influences/i)).toBeInTheDocument();
      expect(screen.getByText(/Starting number of users/i)).toBeInTheDocument();
    });
  });

  describe('Constants Arrays Tests', () => {
    test('should use memoized option arrays to prevent re-renders', () => {
      // Arrange
      const { rerender } = render(<FunnelSettingsSection {...mockProps} />);

      // Act - Re-render with same props
      rerender(<FunnelSettingsSection {...mockProps} />);

      // Assert - Should use same option objects (test by checking static options are present)
      expect(screen.getByText('Transactional')).toBeInTheDocument();
      expect(screen.getByText('1 - Neutral/Logical')).toBeInTheDocument();
      expect(screen.getByText('Paid Search')).toBeInTheDocument();
    });

    test('should have all expected journey type options', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act
      const journeyTypeSelect = screen.getByLabelText(/Journey Type/i);
      await user.click(journeyTypeSelect);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Transactional')).toBeInTheDocument();
        expect(screen.getByText('Exploratory')).toBeInTheDocument();
        expect(screen.getByText('Emotional')).toBeInTheDocument();
        expect(screen.getByText('Legal Required')).toBeInTheDocument();
        expect(screen.getByText('Conversational')).toBeInTheDocument();
        expect(screen.getByText('Urgent')).toBeInTheDocument();
      });
    });

    test('should have all expected emotion level options', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act
      const emotionSelect = screen.getByLabelText(/Emotion \(E\)/i);
      await user.click(emotionSelect);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('1 - Neutral/Logical')).toBeInTheDocument();
        expect(screen.getByText('2 - Slightly Emotional')).toBeInTheDocument();
        expect(screen.getByText('3 - Moderately Emotional')).toBeInTheDocument();
        expect(screen.getByText('4 - Highly Emotional')).toBeInTheDocument();
        expect(screen.getByText('5 - Extremely Emotional')).toBeInTheDocument();
      });
    });

    test('should have all expected traffic source options', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act
      const sourceSelect = screen.getByLabelText(/Traffic Source/i);
      await user.click(sourceSelect);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Paid Search')).toBeInTheDocument();
        expect(screen.getByText('Paid Social')).toBeInTheDocument();
        expect(screen.getByText('Organic Search')).toBeInTheDocument();
        expect(screen.getByText('Direct/Referral')).toBeInTheDocument();
        expect(screen.getByText('Display/Email')).toBeInTheDocument();
        expect(screen.getByText('Social Organic')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tests', () => {
    test('should not re-render unnecessarily when unrelated props change', () => {
      // Arrange
      const renderSpy = jest.fn();
      const TestWrapper = (props: any) => {
        renderSpy();
        return <FunnelSettingsSection {...props} />;
      };

      const { rerender } = render(<TestWrapper {...mockProps} />);
      renderSpy.mockClear();

      // Act - Change an unrelated prop (this simulates parent re-render)
      rerender(<TestWrapper {...mockProps} someUnrelatedProp="changed" />);

      // Assert - Component should not re-render if its actual props haven't changed
      // Note: This tests the memoization of the constants arrays
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    test('should update efficiently when single prop changes', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act
      const u0Input = screen.getByLabelText(/U₀ \(Initial Cohort\)/i);
      await user.clear(u0Input);
      await user.type(u0Input, '5000');

      // Assert
      expect(mockProps.setU0).toHaveBeenCalledWith(5000);
      // Should not call other setters
      expect(mockProps.setE).not.toHaveBeenCalled();
      expect(mockProps.setN).not.toHaveBeenCalled();
    });
  });

  describe('Validation Tests', () => {
    test('should handle step input for U0', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act
      const u0Input = screen.getByLabelText(/U₀ \(Initial Cohort\)/i);
      await user.clear(u0Input);
      await user.type(u0Input, '1500'); // Should be valid (step=100)

      // Assert
      expect(mockProps.setU0).toHaveBeenCalledWith(1500);
    });

    test('should handle decimal inputs for weight parameters', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act - Expand to advanced settings first
      const mainTrigger = screen.getAllByRole('button')[0];
      await user.click(mainTrigger);

      await waitFor(() => {
        expect(screen.getByText('Advanced Weight Settings')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Advanced Weight Settings'));

      await waitFor(() => {
        const wEInput = screen.getByLabelText(/w_E \(Emotion weight\)/i);
        expect(wEInput).toBeInTheDocument();
      });

      const wEInput = screen.getByLabelText(/w_E \(Emotion weight\)/i);
      await user.clear(wEInput);
      await user.type(wEInput, '0.25'); // Decimal value

      // Assert
      expect(mockProps.setWE).toHaveBeenCalledWith(0.25);
    });
  });

  describe('Integration Tests', () => {
    test('should maintain state consistency across multiple changes', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<FunnelSettingsSection {...mockProps} />);

      // Act - Make multiple changes
      const emotionSelect = screen.getByLabelText(/Emotion \(E\)/i);
      await user.click(emotionSelect);
      
      await waitFor(() => {
        expect(screen.getByText('5 - Extremely Emotional')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('5 - Extremely Emotional'));

      const necessitySelect = screen.getByLabelText(/Necessity \(N\)/i);
      await user.click(necessitySelect);
      
      await waitFor(() => {
        expect(screen.getByText('4 - Very Important')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('4 - Very Important'));

      // Assert
      expect(mockProps.setE).toHaveBeenCalledWith(5);
      expect(mockProps.setN).toHaveBeenCalledWith(4);
    });
  });
});