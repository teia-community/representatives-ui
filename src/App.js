import React from 'react';
import { Outlet } from 'react-router-dom';
import { RepresentativesContextProvider } from './containers/context';
import { Header } from './containers/header';
import { Footer } from './containers/footer';
import { Parameters } from './containers/parameters';
import { Proposals } from './containers/proposals';
import { CreateProposalForms } from './containers/forms';


export function App() {
    return (
        <RepresentativesContextProvider>
            <div className='app-container'>
                <Header />
                <Outlet />
                <Footer />
            </div>
        </RepresentativesContextProvider>
    );
}

export function MultisigParameters() {
    return (
        <main>
            <h1>Teia Community Representatives multisig</h1>
            <Parameters />
        </main>
    );
}

export function MultisigProposals() {
    return (
        <main>
            <h1>Community proposals</h1>
            <Proposals />
        </main>
    );
}

export function CreateProposals() {
    return (
        <main>
            <h1>Create new proposals</h1>
            <CreateProposalForms />
        </main>
    );
}

export function NotFound() {
    return (
        <main>
            <p>Page not found...</p>
        </main>
    );
}
