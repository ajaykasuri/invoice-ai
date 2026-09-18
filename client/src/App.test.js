import { render, screen } from '@testing-library/react';
import App from './App';

test('renders invoice upload page', () => {
  render(<App />);
  const heading = screen.getByText(/upload invoice/i);
  expect(heading).toBeInTheDocument();
});
