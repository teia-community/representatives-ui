import React, { createContext } from 'react';
import { TezosToolkit } from '@taquito/taquito';
import { BeaconWallet } from '@taquito/beacon-wallet';
import { Parser } from '@taquito/michel-codec';
import { validateAddress } from '@taquito/utils';
import { create } from 'ipfs-http-client';
import { NETWORK, REPRESENTATIVES_CONTRACT_ADDRESS, RPC_NODE, IPFS_CLIENT } from '../constants';
import { InformationMessage, ConfirmationMessage, ErrorMessage } from './messages';
import * as utils from './utils';


// Initialize the tezos toolkit
const tezos = new TezosToolkit(RPC_NODE);

// Initialize the wallet
const wallet = new BeaconWallet({
    name: 'Representatives multisig',
    preferredNetwork: NETWORK
});

// Pass the wallet to the tezos toolkit
tezos.setWalletProvider(wallet);

// Create an instance of the IPFS client
const ipfsClient = create(IPFS_CLIENT);

// Create the representatives context
export const RepresentativesContext = createContext();

// Create the representatives context provider component
export class RepresentativesContextProvider extends React.Component {

    constructor(props) {
        // Pass the properties to the base class
        super(props);

        // Define the component state parameters
        this.state = {
            // The user address
            userAddress: undefined,

            // The representatives contract storage
            storage: undefined,

            // The representatives contract mutez balance
            balance: undefined,

            // The community represented by the user
            community: undefined,

            // The representatives aliases
            representativesAliases: undefined,

            // The representatives proposals
            proposals: undefined,

            // The community votes
            communityVotes: undefined,

            // The representatives contract reference
            contract: undefined,

            // The information message
            informationMessage: undefined,

            // The confirmation message
            confirmationMessage: undefined,

            // The error message
            errorMessage: undefined,

            // Sets the information message
            setInformationMessage: (message) => this.setState({
                informationMessage: message
            }),

            // Sets the confirmation message
            setConfirmationMessage: (message) => this.setState({
                confirmationMessage: message
            }),

            // Sets the error message
            setErrorMessage: (message) => this.setState({
                errorMessage: message
            }),

            // Returns the representatives contract reference
            getContract: async () => {
                if (this.state.contract) {
                    return this.state.contract;
                }

                console.log('Accessing the representatives contract...');
                const contract = await utils.getContract(tezos, REPRESENTATIVES_CONTRACT_ADDRESS);
                this.setState({ contract: contract });

                return contract;
            },

            // Connects the user wallet
            connectWallet: async () => {
                console.log('Connecting the user wallet...');
                await wallet.requestPermissions({ network: { type: NETWORK, rpcUrl: RPC_NODE } })
                    .catch(error => console.log('Error while requesting wallet permissions:', error));

                console.log('Accessing the user address...');
                const userAddress = await utils.getUserAddress(wallet);
                this.setState({ userAddress: userAddress });

                if (this.state.storage && userAddress) {
                    console.log('Getting the user community...');
                    const community = this.state.storage.representatives[userAddress];
                    this.setState({ community: community });

                    if (community) {
                        console.log('Downloading the user commnuity votes...');
                        const communityVotes = await utils.getCommunityVotes(community, this.state.storage.votes);
                        this.setState({ communityVotes: communityVotes });
                    }
                }
            },

            // Disconnects the user wallet
            disconnectWallet: async () => {
                // Clear the active account
                console.log('Disconnecting the user wallet...');
                await wallet.clearActiveAccount();

                // Reset the user related state parameters
                this.setState({
                    userAddress: undefined,
                    community: undefined,
                    communityVotes: undefined,
                    contract: undefined
                });
            },

            // Waits for an operation to be confirmed
            confirmOperation: async (operation) => {
                // Return if the operation is undefined
                if (operation === undefined) return;

                // Display the information message
                this.state.setInformationMessage('Waiting for the operation to be confirmed...');

                // Wait for the operation to be confirmed
                console.log('Waiting for the operation to be confirmed...');
                await operation.confirmation(1)
                    .then(() => console.log(`Operation confirmed: https://${NETWORK}.tzkt.io/${operation.opHash}`))
                    .catch(error => console.log('Error while confirming the operation:', error));

                // Remove the information message
                this.state.setInformationMessage(undefined);
            },

            // Creates a representatives proposal
            createProposal: async (kind) => {
                // Get the representatives contract reference
                const contract = await this.state.getContract();

                // Return if the representatives contract reference is not available
                if (!contract) return;

                // Send the add proposal operation
                console.log('Sending the add proposal operation...');
                const operation = await contract.methodsObject.add_proposal(kind).send()
                    .catch(error => console.log('Error while sending the add proposal operation:', error));

                // Wait for the confirmation
                await this.state.confirmOperation(operation);

                // Update the proposals
                const proposals = await utils.getBigmapKeys(this.state.storage.proposals);
                this.setState({ proposals: proposals });
            },

            // Creates a text proposal
            createTextProposal: async (ipfsPath) => {
                // Check that the IPFS path is not undefined
                if (!ipfsPath) {
                    this.state.setErrorMessage('The text proposal needs to be uploaded first to IPFS');
                    return;
                }

                // Create the text proposal
                const kind = { text: utils.stringToHex('ipfs://' + ipfsPath) };
                this.state.createProposal(kind);
            },

            // Creates a transfer mutez proposal
            createTransferMutezProposal: async (transfers) => {
                // Loop over the transfers information
                let totalAmount = 0;

                for (const transfer of transfers) {
                    // Check that the destination address is a valid address
                    const destination = transfer.destination;

                    if (!(destination && validateAddress(destination) === 3)) {
                        this.state.setErrorMessage(`The provided address is not a valid tezos address: ${destination}`);
                        return;
                    }

                    totalAmount += transfer.amount;
                }

                // Check that the total amount is smaller thant the contract balance
                if (totalAmount > this.state.balance) {
                    this.state.setErrorMessage('The total amount of tez to transfer is larger than the current balance');
                    return;
                }

                // Create the transfer mutez proposal
                const kind = { transfer_mutez: transfers };
                this.state.createProposal(kind);
            },

            // Creates a transfer token proposal
            createTransferTokenProposal: async (tokenAddress, tokenId, transfers) => {
                // Check that the token contract address is a valid address
                if (!(tokenAddress && validateAddress(tokenAddress) === 3)) {
                    this.state.setErrorMessage(`The provided token contract address is not a valid tezos address: ${tokenAddress}`);
                    return;
                }

                // Loop over the transfers information
                for (const transfer of transfers) {
                    // Check that the destination address is a valid address
                    const destination = transfer.destination;

                    if (!(destination && validateAddress(destination) === 3)) {
                        this.state.setErrorMessage(`The provided address is not a valid tezos address: ${destination}`);
                        return;
                    }
                }

                // Create the transfer token proposal
                const kind = {
                    transfer_token: {
                        fa2: tokenAddress,
                        token_id: tokenId,
                        distribution: transfers
                    }
                };
                this.state.createProposal(kind);
            },

            // Creates a lambda function proposal
            createLambdaFunctionProposal: async (michelineCode) => {
                // Try to get the lambda function from the Micheline code
                let lambdaFunction;

                try {
                    const parser = new Parser();
                    lambdaFunction = parser.parseMichelineExpression(michelineCode);
                } catch (error) {
                    this.state.setErrorMessage('The provided lambda function Michelson code is not correct');
                    return;
                }

                // Create the lambda function proposal
                const kind = { lambda_function: lambdaFunction };
                this.state.createProposal(kind);
            },

            // Creates an add representative proposal
            createAddRepresentativeProposal: async (representative) => {
                // Check that the representative address is a valid address
                if (!(representative && validateAddress(representative.address) === 3)) {
                    this.state.setErrorMessage(`The provided address is not a valid tezos address: ${representative.address}`);
                    return;
                }

                // Check that the representative address is not a representative
                if (representative.address in this.state.storage?.representatives) {
                    this.state.setErrorMessage('The provided address is already a representative');
                    return;
                }

                // Check that the representative community is not an existing community
                if (this.state.storage?.communities.includes(representative.community)) {
                    this.state.setErrorMessage('The provided community is already a representatives community');
                    return;
                }

                // Create the add representative proposal
                const kind = { add_representative: representative };
                this.state.createProposal(kind);
            },

            // Creates a remove representative proposal
            createRemoveRepresentativeProposal: async (representative) => {
                // Check that the representative address is a valid address
                if (!(representative && validateAddress(representative.address) === 3)) {
                    this.state.setErrorMessage(`The provided address is not a valid tezos address: ${representative.address}`);
                    return;
                }

                // Check that the representative address is from a representative
                if (!(representative.address in this.state.storage?.representatives)) {
                    this.state.setErrorMessage('The provided address is not from a representative');
                    return;
                }

                // Check that the representative community is correct
                if (this.state.storage?.representatives[representative.address] !== representative.community) {
                    this.state.setErrorMessage('The provided community is not the representative community');
                    return;
                }

                // Create the remove representative proposal
                const kind = { remove_representative: representative };
                this.state.createProposal(kind);
            },

            // Creates a minimum votes proposal
            createMinimumVotesProposal: async (minimumVotes) => {
                // Check that the minimum votes are within the expected range
                if (minimumVotes <= 0) {
                    this.state.setErrorMessage('The minimum votes need to be higher than 0');
                    return;
                }

                // Create the minimum votes proposal
                const kind = { minimum_votes: minimumVotes };
                this.state.createProposal(kind);
            },

            // Creates an expiration time proposal
            createExpirationTimeProposal: async (expirationTime) => {
                // Check that the expiration time is at least one day
                if (expirationTime <= 0) {
                    this.state.setErrorMessage('The expiration time needs to be at least one day');
                    return;
                }

                // Create the expiration time proposal
                const kind = { expiration_time: expirationTime };
                this.state.createProposal(kind);
            },

            // Votes a proposal
            voteProposal: async (proposalId, approval) => {
                // Get the representatives contract reference
                const contract = await this.state.getContract();

                // Return if the representatives contract reference is not available
                if (!contract) return;

                // Send the vote proposal operation
                console.log('Sending the vote proposal operation...');
                const operation = await contract.methods.vote_proposal(proposalId, approval).send()
                    .catch(error => console.log('Error while sending the vote proposal operation:', error));

                // Wait for the confirmation
                await this.state.confirmOperation(operation);

                // Update the proposals and the community votes
                const storage = this.state.storage;
                const proposals = await utils.getBigmapKeys(storage.proposals);
                const communityVotes = await utils.getCommunityVotes(this.state.community, storage.votes);
                this.setState({
                    proposals: proposals,
                    communityVotes: communityVotes
                });
            },

            // Executes a proposal
            executeProposal: async (proposalId) => {
                // Get the representatives contract reference
                const contract = await this.state.getContract();

                // Return if the representatives contract reference is not available
                if (!contract) return;

                // Send the execute proposal operation
                console.log('Sending the execute proposal operation...');
                const operation = await contract.methods.execute_proposal(proposalId).send()
                    .catch(error => console.log('Error while sending the execute proposal operation:', error));

                // Wait for the confirmation
                await this.state.confirmOperation(operation);

                // Update the relevant state information
                const storage = await utils.getContractStorage(REPRESENTATIVES_CONTRACT_ADDRESS);
                const balance = await utils.getBalance(REPRESENTATIVES_CONTRACT_ADDRESS);
                const community = storage.representatives[this.state.userAddress];
                const representativesAliases = await utils.getUserAliases(Object.keys(storage.representatives));
                const proposals = await utils.getBigmapKeys(storage.proposals);
                const communityVotes = await utils.getCommunityVotes(community, storage.votes);
                this.setState({
                    storage: storage,
                    balance: balance,
                    community: community,
                    representativesAliases: representativesAliases,
                    proposals: proposals,
                    communityVotes: communityVotes
                });
            },

            // Uploads a file to ipfs and returns the ipfs path
            uploadFileToIpfs: async (file, displayUploadInformation) => {
                // Check that the file is not undefined
                if (!file) {
                    this.state.setErrorMessage('A file needs to be loaded before uploading to IPFS');
                    return;
                }

                // Display the information message
                if (displayUploadInformation) this.state.setInformationMessage(`Uploading ${file.name} to ipfs...`);

                // Upload the file to IPFS
                console.log(`Uploading ${file.name} to ipfs...`);
                const added = await ipfsClient.add(file)
                    .catch(error => console.log(`Error while uploading ${file.name} to ipfs:`, error));

                // Remove the information message
                if (displayUploadInformation) this.state.setInformationMessage(undefined);

                // Return the IPFS path
                return added?.path;
            },
        };

        // Loads all the needed information at once
        this.loadInformation = async () => {
            // Initialize the new state dictionary
            const newState = {}

            console.log('Accessing the user address...');
            const userAddress = await utils.getUserAddress(wallet);
            newState.userAddress = userAddress;

            console.log('Downloading the representatives contract storage...');
            const storage = await utils.getContractStorage(REPRESENTATIVES_CONTRACT_ADDRESS);
            newState.storage = storage;

            console.log('Getting the representatives contract tez balance...');
            const balance = await utils.getBalance(REPRESENTATIVES_CONTRACT_ADDRESS);
            newState.balance = balance;

            if (storage) {
                console.log('Downloading the representatives aliases...');
                const representativesAliases = await utils.getUserAliases(Object.keys(storage.representatives));
                newState.representativesAliases = representativesAliases;

                console.log('Downloading the representatives proposals...');
                const proposals = await utils.getBigmapKeys(storage.proposals);
                newState.proposals = proposals;

                if (userAddress) {
                    console.log('Getting the user community...');
                    const community = storage.representatives[userAddress];
                    newState.community = community;

                    if (community) {
                        console.log('Downloading the user community votes...');
                        const communityVotes = await utils.getCommunityVotes(community, storage.votes);
                        newState.communityVotes = communityVotes;
                    }
                }
            }

            // Update the component state
            this.setState(newState);
        };
    }

    componentDidMount() {
        // Load all the relevant information
        this.loadInformation();
    }

    render() {
        return (
            <RepresentativesContext.Provider value={this.state}>
                {this.state.informationMessage &&
                    <InformationMessage message={this.state.informationMessage} />
                }

                {this.state.confirmationMessage &&
                    <ConfirmationMessage message={this.state.confirmationMessage} onClick={() => this.state.setConfirmationMessage(undefined)} />
                }

                {this.state.errorMessage &&
                    <ErrorMessage message={this.state.errorMessage} onClick={() => this.state.setErrorMessage(undefined)} />
                }

                {this.props.children}
            </RepresentativesContext.Provider>
        );
    }
}
