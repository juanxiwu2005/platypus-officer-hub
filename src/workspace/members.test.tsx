import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceProvider } from './client';
import MembersPanel from './members';
import { workspaceFixture } from './testing/fixtures';
let current=workspaceFixture();
beforeEach(()=>{localStorage.clear();current=workspaceFixture();vi.stubGlobal('fetch',vi.fn(async()=>Response.json(current)));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const open=()=>render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><WorkspaceProvider><MembersPanel/></WorkspaceProvider></MemoryRouter>);
describe('unfinished member appointments',()=>{
  it('restores unsent member input after changing chapters',async()=>{
    const first=open();const field=await screen.findByLabelText('Fictional member name');
    fireEvent.change(field,{target:{value:'Demo Robin'}});
    first.unmount();open();
    await waitFor(()=>expect((screen.getByLabelText('Fictional member name') as HTMLInputElement).value).toBe('Demo Robin'));
  });
  it('never restores member input into another private workspace',async()=>{
    const first=open();fireEvent.change(await screen.findByLabelText('Fictional member name'),{target:{value:'Demo Robin'}});first.unmount();
    current={...current,state:{...current.state,workspaceId:'another_private_workspace'}};open();
    await waitFor(()=>expect((screen.getByLabelText('Fictional member name') as HTMLInputElement).value).toBe(''));
  });
  it('keeps the current text and blocks a mutation when setup flushing fails',async()=>{
    const flush=vi.fn(async()=>{throw new Error('Save the current setup first.');});
    render(<MemoryRouter><WorkspaceProvider><MembersPanel beforeSave={flush}/></WorkspaceProvider></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('Fictional member name'),{target:{value:'Demo Robin'}});
    fireEvent.click(screen.getByRole('button',{name:'Add demo member'}));
    await screen.findByText('Save the current setup first.');
    expect((screen.getByLabelText('Fictional member name') as HTMLInputElement).value).toBe('Demo Robin');
    expect(vi.mocked(fetch).mock.calls.every(call=>call[1]?.method!=='POST')).toBe(true);
  });
});
