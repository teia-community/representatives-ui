import React, { useContext } from 'react';
import { NETWORK, REPRESENTATIVES_CONTRACT_ADDRESS } from '../constants';
import { RepresentativesContext } from './context';
import { TezosAddressLink } from './links';


export function Parameters() {
    // Get the required representatives context information
    const { userAddress, storage, balance } = useContext(RepresentativesContext);

    // Get the representatives communities
    const communities = storage && {};

    if (storage) {
        Object.keys(storage.representatives).map(representative =>
            communities[storage.representatives[representative]] = representative);
    }

    return (
        <section>
            <h2>Main parameters</h2>
            <ul className='parameters-list'>
                <li>Representatives:
                    <ul className='representatives-list'>
                        {storage && storage.communities.sort().map((community, index) => (
                            <li key={index}>
                                <TezosAddressLink
                                    address={communities[community]}
                                    className={communities[community] === userAddress && 'is-user'}
                                    useAlias >
                                    <p>{community}</p>
                                </TezosAddressLink>
                            </li>
                        ))}
                    </ul>
                </li>
                <li>Contract address: <TezosAddressLink address={REPRESENTATIVES_CONTRACT_ADDRESS} /></li>
                <li>Network: {NETWORK}</li>
                <li>Positive votes needed to execute a proposal: {storage?.minimum_votes} votes</li>
                <li>Proposal expiration time: {storage?.expiration_time} days</li>
                <li>Balance: {balance ? balance / 1000000 : '0'} ꜩ</li>
            </ul>
        </section>
    );
}
