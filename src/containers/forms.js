import React, { useContext, useState } from 'react';
import { TOKENS } from '../constants';
import { RepresentativesContext } from './context';
import { Button } from './button';
import { IpfsLink } from './links';


export function CreateProposalForms() {
    // Get the representatives context
    const context = useContext(RepresentativesContext);

    // Return if the user is not connected
    if (!context.userAddress) {
        return (
            <section>
                <p>You need to sync your wallet to be able to create proposals.</p>
            </section>
        );
    }

    // Return if the user is not one of the community representatives
    if (!context.community) {
        return (
            <section>
                <p>Only community representatives can create new proposals.</p>
            </section>
        );
    }

    return (
        <>
            <section>
                <h2>Transfer tez proposal</h2>
                <p>
                    Use this form to create a proposal that, if accepted, it will transfer
                    the specified amount of tez from the multisig to a list of tezos addresses.
                </p>
                <TransferTezProposalForm handleSubmit={context.createTransferMutezProposal} />
            </section>

            <section>
                <h2>Transfer token proposal</h2>
                <p>
                    Use this form to create a proposal that, if accepted, it will transfer
                    the specified amount of token editions from the multisig to a list of tezos addresses.
                </p>
                <TransferTokenProposalForm handleSubmit={context.createTransferTokenProposal} />
            </section>

            <section>
                <h2>Text proposal</h2>
                <p>
                    Use this form to create a proposal to approve a text or decission.
                </p>
                <p>
                    This proposal has no direct consequences on the blockchain. However, if accepted and executed,
                    it should trigger some off-chain actions by one of the community representatives (e.g. change a website UI,
                    decide on a dog name, buy bread at the bakery). The text will be stored in IPFS for archival purposes.
                </p>
                <TextProposalForm
                    uploadFileToIpfs={context.uploadFileToIpfs}
                    handleSubmit={context.createTextProposal}
                />
            </section>

            <section>
                <h2>Lambda function proposal</h2>
                <p>
                    Use this form to create a proposal that, if accepted, it will execute some smart contract code
                    stored in a Michelson lambda function.
                </p>
                <p>
                    This proposal could be used to administer other smart contracts of which the multsign is the admin
                    (e.g. to update some smart contract fees), or to execute entry points from other contracts (e.g. swap
                    or collect a token, vote in anoter DAO / multisig).
                </p>
                <p className='create-proposal-warning'>
                    Warning: Executing arbitrary smart contract code could compromise the multisig or have unexpected
                    consequences. The lambda function code should have been revised by some trusted smart contract expert
                    before the proposal is accepted and executed.
                </p>
                <LambdaFunctionProposalForm handleSubmit={context.createLambdaFunctionProposal} />
            </section>

            <section>
                <h2>Add representative proposal</h2>
                <p>
                    Use this form to create a proposal that, if accepted, it will add a new community representative to
                    the multisig.
                </p>
                <p className='create-proposal-warning'>
                    Warning: The minimum number of positive votes required to approve a proposal will not be updated,
                    so adding a new representative will effectively make easier to approve proposals.
                </p>
                <AddRepresentativeProposalForm handleSubmit={context.createAddRepresentativeProposal} />
            </section>

            <section>
                <h2>Remove representative proposal</h2>
                <p>
                    Use this form to create a proposal that, if accepted, it will remove one of the community representatives.
                </p>
                <p className='create-proposal-warning'>
                    Warning: The minimum number of votes required to approve a proposal will not be updated. Depending
                    on the situation, it might become more difficult to approve proposals.
                </p>
                <RemoveRepresentativeProposalForm
                    representatives={context.storage.representatives}
                    aliases={context.representativesAliases}
                    handleSubmit={context.createRemoveRepresentativeProposal}
                />
            </section>

            <section>
                <h2>Minimum votes proposal</h2>
                <p>
                    Use this form to create a proposal that, if accepted, it will change the minimum number of positive
                    votes required to approve proposals.
                </p>
                <p className='create-proposal-warning'>
                    Warning: This will affect all active proposals at the time of execution. If the minimum votes is decreased,
                    some active proposals might become accepted and it will be possible to execute them.
                </p>
                <MinimumVotesProposalForm
                    defaultValue={context.storage.minimum_votes}
                    handleSubmit={context.createMinimumVotesProposal}
                />
            </section>

            <section>
                <h2>Expiration time proposal</h2>
                <p>
                    Use this form to create a proposal that, if accepted, it will change the proposals expiration time.
                </p>
                <p className='create-proposal-warning'>
                    Warning: This will affect all active and expired proposals at the time of execution. If the expiration
                    time is increased, some expired proposals might become active again. Some might even become executable if
                    they have enough positive votes. If the expiration time is decreased, some previously active proposal might
                    become expired.
                </p>
                <ExpirationTimeProposalForm
                    defaultValue={context.storage.expiration_time}
                    handleSubmit={context.createExpirationTimeProposal}
                />
            </section>
        </>
    );
}

function TransferTezProposalForm(props) {
    // Set the component state
    const [transfers, setTransfers] = useState([
        { amount: 0, destination: '' }
    ]);

    // Define the on change handler
    const handleChange = (index, parameter, value) => {
        // Create a new transfers array
        const newTransfers = transfers.map((transfer, i) => {
            // Create a new transfer
            const newTransfer = {
                amount: transfer.amount,
                destination: transfer.destination
            };

            // Update the value if we are at the correct index position
            if (i === index) {
                newTransfer[parameter] = value;
            }

            return newTransfer;
        });

        // Update the component state
        setTransfers(newTransfers);
    };

    // Define the on click handler
    const handleClick = (e, increase) => {
        e.preventDefault();

        // Create a new transfers array
        const newTransfers = transfers.map((transfer) => (
            { amount: transfer.amount, destination: transfer.destination }
        ));

        // Add or remove a transfer from the list
        if (increase) {
            newTransfers.push({ amount: 0, destination: '' });
        } else if (newTransfers.length > 1) {
            newTransfers.pop();
        }

        // Update the component state
        setTransfers(newTransfers);
    };

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();
        props.handleSubmit(
            transfers.map((transfer) => ({
                amount: transfer.amount * 1000000,
                destination: transfer.destination
            }))
        );
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className='form-input'>
                <div className='transfers-input'>
                    {transfers.map((transfer, index) => (
                        <div key={index} className='transfer-input'>
                            <label>Amount to transfer (ꜩ):
                                {' '}
                                <input
                                    type='number'
                                    min='0'
                                    step='0.000001'
                                    value={transfer.amount}
                                    onChange={e => handleChange(index, 'amount', e.target.value)}
                                />
                            </label>
                            <br />
                            <label>Destination address:
                                {' '}
                                <input
                                    type='text'
                                    spellCheck='false'
                                    minLength='36'
                                    maxLength='36'
                                    className='tezos-wallet-input'
                                    value={transfer.destination}
                                    onChange={e => handleChange(index, 'destination', e.target.value)}
                                />
                            </label>
                        </div>
                    ))}
                </div>
                <Button text='+' onClick={e => handleClick(e, true)} />
                {' '}
                <Button text='-' onClick={e => handleClick(e, false)} />
            </div>
            <input type='submit' value='send proposal' />
        </form>
    );
}

function TransferTokenProposalForm(props) {
    // Set the component state
    const [tokenContract, setTokenContract] = useState('');
    const [tokenId, setTokenId] = useState('');
    const [transfers, setTransfers] = useState([
        { amount: 0, destination: '' }
    ]);

    // Define the on change handler
    const handleChange = (index, parameter, value) => {
        // Create a new transfers array
        const newTransfers = transfers.map((transfer, i) => {
            // Create a new transfer
            const newTransfer = {
                amount: transfer.amount,
                destination: transfer.destination
            };

            // Update the value if we are at the correct index position
            if (i === index) {
                newTransfer[parameter] = value;
            }

            return newTransfer;
        });

        // Update the component state
        setTransfers(newTransfers);
    };

    // Define the on click handler
    const handleClick = (e, increase) => {
        e.preventDefault();

        // Create a new transfers array
        const newTransfers = transfers.map((transfer) => (
            { amount: transfer.amount, destination: transfer.destination }
        ));

        // Add or remove a transfer from the list
        if (increase) {
            newTransfers.push({ amount: 0, destination: '' });
        } else if (newTransfers.length > 1) {
            newTransfers.pop();
        }

        // Update the component state
        setTransfers(newTransfers);
    };

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();

        // Create a new transfers array that makes use of the correct decimals
        const token = TOKENS.find(token => token.fa2 === tokenContract);
        const newTransfers = transfers.map(transfer => (
            { amount: token ? transfer.amount * token.decimals : transfer.amount, destination: transfer.destination }
        ));

        // Submit the proposal
        props.handleSubmit(tokenContract, tokenId, newTransfers);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className='form-input'>
                <label>Token contract address:
                    {' '}
                    <input
                        type='text'
                        list='tokenContracts'
                        spellCheck='false'
                        minLength='36'
                        maxLength='36'
                        className='contract-address-input'
                        value={tokenContract}
                        onMouseDown={() => setTokenContract('')}
                        onChange={e => setTokenContract(e.target.value)}
                    />
                    <datalist id='tokenContracts'>
                        <option value=''></option>
                        {TOKENS.map((token) => (
                            <option key={token.fa2} value={token.fa2}>{token.name}</option>
                        ))}
                    </datalist>
                </label>
                <br />
                <label>Token Id:
                    {' '}
                    <input
                        type='number'
                        min='0'
                        step='1'
                        value={tokenId}
                        onChange={e => setTokenId(e.target.value)}
                    />
                </label>
                <br />
                <div className='transfers-input'>
                    {transfers.map((transfer, index) => (
                        <div key={index} className='transfer-input'>
                            <label>Token editions:
                                {' '}
                                <input
                                    type='number'
                                    min='1'
                                    step='1'
                                    value={transfer.amount}
                                    onChange={e => handleChange(index, 'amount', e.target.value)}
                                />
                            </label>
                            <br />
                            <label>Destination address:
                                {' '}
                                <input
                                    type='text'
                                    spellCheck='false'
                                    minLength='36'
                                    maxLength='36'
                                    className='tezos-wallet-input'
                                    value={transfer.destination}
                                    onChange={e => handleChange(index, 'destination', e.target.value)}
                                />
                            </label>
                        </div>
                    ))}
                </div>
                <Button text='+' onClick={e => handleClick(e, true)} />
                {' '}
                <Button text='-' onClick={e => handleClick(e, false)} />
            </div>
            <input type='submit' value='send proposal' />
        </form>
    );
}

function TextProposalForm(props) {
    // Set the component state
    const [file, setFile] = useState(undefined);
    const [ipfsPath, setIpfsPath] = useState(undefined);

    // Define the on change handler
    const handleChange = e => {
        setFile(e.target.files[0]);
        setIpfsPath(undefined);
    };

    // Define the on click handler
    const handleClick = async e => {
        e.preventDefault();

        // Update the component state
        setIpfsPath(await props.uploadFileToIpfs(file, true));
    };

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();
        props.handleSubmit(ipfsPath);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className='form-input'>
                <label>File with the text to approve:
                    {' '}
                    <input
                        type='file'
                        onChange={handleChange}
                    />
                </label>
                {file &&
                    <div>
                        <Button text={ipfsPath ? 'uploaded' : 'upload to IPFS'} onClick={handleClick} />
                        {' '}
                        {ipfsPath &&
                            <IpfsLink path={ipfsPath} />
                        }
                    </div>
                }
            </div>
            <input type='submit' value='send proposal' />
        </form>
    );
}

function LambdaFunctionProposalForm(props) {
    // Set the component state
    const [michelineCode, setMichelineCode] = useState('');

    // Define the on change handler
    const handleChange = e => {
        setMichelineCode(e.target.value);
    };

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();
        props.handleSubmit(michelineCode);
    };

    return (
        <form onSubmit={handleSubmit}>
            <label className='form-input'>Lambda function code in Micheline format:
                {' '}
                <textarea
                    className='micheline-code'
                    spellCheck='false'
                    value={michelineCode}
                    onChange={handleChange}
                />
            </label>
            <input type='submit' value='send proposal' />
        </form>
    );
}

function AddRepresentativeProposalForm(props) {
    // Set the component state
    const [user, setUser] = useState('');

    // Define the on change handler
    const handleChange = e => {
        setUser(e.target.value);
    };

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();
        props.handleSubmit(user);
    };

    return (
        <form onSubmit={handleSubmit}>
            <label className='form-input'>User to add:
                {' '}
                <input
                    type='text'
                    spellCheck='false'
                    minLength='36'
                    maxLength='36'
                    className='tezos-wallet-input'
                    value={user}
                    onChange={handleChange}
                />
            </label>
            <input type='submit' value='send proposal' />
        </form>
    );
}

function RemoveRepresentativeProposalForm(props) {
    // Set the component state
    const [representative, setRepresentative] = useState('');

    // Define the on change handler
    const handleChange = e => {
        setRepresentative(e.target.value);
    };

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();
        props.handleSubmit({
            address: representative,
            community: props.representatives[representative]
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <label className='form-input'>Representative to remove:
                {' '}
                <input
                    type='text'
                    list='users'
                    spellCheck='false'
                    minLength='36'
                    maxLength='36'
                    className='contract-address-input'
                    value={representative}
                    onMouseDown={() => setRepresentative('')}
                    onChange={handleChange}
                />
                <datalist id='users'>
                    <option value=''></option>
                    {Object.keys(props.representatives).map((representativeAddress, index) => (
                        <option key={index} value={representativeAddress}>
                            {props.aliases ? props.aliases[representativeAddress] : representativeAddress}
                        </option>
                    ))}
                </datalist>
            </label>
            <input type='submit' value='send proposal' />
        </form>
    );
}

function MinimumVotesProposalForm(props) {
    // Set the component state
    const [minimumVotes, setMinimumVotes] = useState(props.defaultValue);

    // Define the on change handler
    const handleChange = e => {
        setMinimumVotes(Math.round(e.target.value));
    };

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();
        props.handleSubmit(minimumVotes);
    };

    return (
        <form onSubmit={handleSubmit}>
            <label className='form-input'>New minimum votes:
                {' '}
                <input
                    type='number'
                    min='1'
                    step='1'
                    value={minimumVotes}
                    onChange={handleChange}
                />
            </label>
            <input type='submit' value='send proposal' />
        </form>
    );
}

function ExpirationTimeProposalForm(props) {
    // Set the component state
    const [expirationTime, setExpirationTime] = useState(props.defaultValue);

    // Define the on change handler
    const handleChange = e => {
        setExpirationTime(Math.round(e.target.value));
    };

    // Define the on submit handler
    const handleSubmit = e => {
        e.preventDefault();
        props.handleSubmit(expirationTime);
    };

    return (
        <form onSubmit={handleSubmit}>
            <label className='form-input'>New expiration time (days):
                {' '}
                <input
                    type='number'
                    min='1'
                    step='1'
                    value={expirationTime}
                    onChange={handleChange}
                />
            </label>
            <input type='submit' value='send proposal' />
        </form>
    );
}
