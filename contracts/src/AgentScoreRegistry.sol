// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    ERC721URIStorage
} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AgentScoreRegistry
 * @notice Registry contract for Autonomous AI Agent reputation scores.
 * @dev Implements AccessControl to ensure only the Chainlink CRE can submit assertions.
 *      Based on specifications for the AgentScore protocol.
 */
contract AgentScoreRegistry is AccessControl, ERC721URIStorage {
    /// @notice Role for the Chainlink Runtime Environment (CRE) orchestrator
    bytes32 public constant CRE_ROLE = keccak256("CRE_ROLE");

    /// @notice Struct to hold agent identity and reputation data
    struct AgentProfile {
        bool isRegistered;
        bool isBlacklisted;
        uint256 score;
        uint256 lastUpdated;
        uint256 assertionCount;
    }

    /// @notice Struct to hold assertion data
    struct Assertion {
        uint256 score;
        bytes data;
        uint256 timestamp;
    }

    /// @notice Mapping from agent address to their profile data
    mapping(address => AgentProfile) public agentProfiles;

    /// @notice Mapping from agent address to their assertion history
    mapping(address => Assertion[]) private _agentAssertions;

    /// @notice List of all registered agent addresses
    address[] public registeredAgents;

    /// @notice Event emitted when a new assertion is submitted
    event AssertionSubmitted(
        address indexed agent,
        uint256 score,
        bytes data,
        uint256 timestamp
    );

    /// @notice Event emitted when a new agent registers
    event AgentRegistered(address indexed agent, string metadataURI);
    /// @notice Event emitted when an agent updates their profile
    event ProfileUpdated(address indexed agent, string metadataURI);
    /// @notice Event emitted when an agent is blacklisted
    event AgentBlacklisted(address indexed agent);
    /// @notice Event emitted when an agent is removed from the blacklist
    event AgentUnblacklisted(address indexed agent);

    /// @notice Error thrown when the admin address is invalid
    error InvalidAdminAddress();
    /// @notice Error thrown when agent is not registered
    error AgentNotRegistered();
    /// @notice Error thrown when agent is already registered
    error AgentAlreadyRegistered();
    /// @notice Error thrown when agent is blacklisted
    error AgentIsBlacklisted();
    /// @notice Error thrown when trying to transfer the Soulbound Token
    error AgentTokenIsSoulbound();

    /**
     * @notice Constructor to initialize the contract with an admin.
     * @param admin The address to be granted DEFAULT_ADMIN_ROLE.
     */
    constructor(address admin) ERC721("AgentScoreIdentity", "ASI") {
        if (admin == address(0)) revert InvalidAdminAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // =============================================================
    //                      IDENTITY REGISTRY
    // =============================================================

    /**
     * @notice Registers a new agent with metadata.
     * @param metadataURI The URI pointing to the agent's metadata (e.g., IPFS).
     */
    function registerAgent(string calldata metadataURI) external {
        if (agentProfiles[msg.sender].isRegistered)
            revert AgentAlreadyRegistered();
        if (agentProfiles[msg.sender].isBlacklisted)
            revert AgentIsBlacklisted();

        AgentProfile storage profile = agentProfiles[msg.sender];
        profile.isRegistered = true;

        registeredAgents.push(msg.sender);

        // Mint Soulbound Token using the agent's address as the tokenId
        uint256 tokenId = uint256(uint160(msg.sender));
        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit AgentRegistered(msg.sender, metadataURI);
    }

    /**
     * @notice Updates the metadata URI for a registered agent.
     * @param metadataURI The new URI pointing to the agent's metadata.
     */
    function updateProfile(string calldata metadataURI) external {
        if (!agentProfiles[msg.sender].isRegistered)
            revert AgentNotRegistered();
        if (agentProfiles[msg.sender].isBlacklisted)
            revert AgentIsBlacklisted();

        _setTokenURI(uint256(uint160(msg.sender)), metadataURI);
        emit ProfileUpdated(msg.sender, metadataURI);
    }

    /**
     * @notice Sets the blacklist status for an agent.
     * @dev Only callable by the DEFAULT_ADMIN_ROLE.
     * @param agent The address of the agent.
     * @param status True to blacklist, false to remove from blacklist.
     */
    function setBlacklistStatus(
        address agent,
        bool status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        agentProfiles[agent].isBlacklisted = status;
        if (status) {
            emit AgentBlacklisted(agent);
        } else {
            emit AgentUnblacklisted(agent);
        }
    }

    /**
     * @notice Returns the number of registered agents.
     * @return The count of registered agents.
     */
    function getRegisteredAgentsCount() external view returns (uint256) {
        return registeredAgents.length;
    }

    /**
     * @notice Returns the list of all registered agent addresses.
     * @return An array of all registered agent addresses.
     */
    function getAllAgents() external view returns (address[] memory) {
        return registeredAgents;
    }

    /**
     * @notice Hook that is called before any token transfer.
     * @dev Enforces Soulbound property: tokens cannot be transferred, only minted or burned.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // If from is not 0 (not minting) and to is not 0 (not burning), it's a transfer.
        // We block transfers to keep the token Soulbound.
        if (from != address(0) && to != address(0)) {
            revert AgentTokenIsSoulbound();
        }

        return super._update(to, tokenId, auth);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControl, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // =============================================================
    //                      REPUTATION REGISTRY
    // =============================================================

    /**
     * @notice Submits an assertion for an agent, updating their score.
     * @dev Only callable by the CRE_ROLE.
     * @param agent The address of the agent.
     * @param score The new reputation score.
     * @param data Additional data or proof associated with the assertion.
     */
    function submitAssertion(
        address agent,
        uint256 score,
        bytes calldata data
    ) external onlyRole(CRE_ROLE) {
        AgentProfile storage profile = agentProfiles[agent];
        if (profile.isBlacklisted) revert AgentIsBlacklisted();

        profile.score = score;
        profile.lastUpdated = block.timestamp;
        profile.assertionCount++;

        _agentAssertions[agent].push(
            Assertion({score: score, data: data, timestamp: block.timestamp})
        );

        emit AssertionSubmitted(agent, score, data, block.timestamp);
    }

    /**
     * @notice Returns the assertion history for a specific agent.
     * @param agent The address of the agent.
     * @return An array of Assertion structs.
     */
    function getAgentHistory(
        address agent
    ) external view returns (Assertion[] memory) {
        return _agentAssertions[agent];
    }

    // =============================================================
    //                      VALIDATION REGISTRY
    // =============================================================
}
