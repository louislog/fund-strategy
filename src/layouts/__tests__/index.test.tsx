import 'jest';

jest.mock('@umijs/max', () => {
  const React = require('react');
  return {
    Outlet: () => React.createElement('div', { 'data-testid': 'outlet' }, 'outlet-child'),
  };
});

jest.mock('antd/es/menu', () => {
  const React = require('react');
  const Menu = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'mock-menu' }, children);
  Menu.Item = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('span', {}, children);
  return { __esModule: true, default: Menu };
});

import BasicLayout from '../BasicLayout';
import React from 'react';
import renderer from 'react-test-renderer';

describe('Layout: BasicLayout', () => {
  it('renders shell with Outlet', () => {
    const wrapper = renderer.create(<BasicLayout />);
    const json = wrapper.toJSON();
    expect(json).toBeTruthy();
    expect(json?.type).toBe('div');
  });
});
