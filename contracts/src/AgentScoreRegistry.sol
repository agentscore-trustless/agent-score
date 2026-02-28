// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AgentScoreRegistry
 * @notice Registry contract for Autonomous AI Agent reputation scores.
 * @dev Implements AccessControl to ensure only the Chainlink CRE can submit assertions.
 *      Based on specifications for the AgentScore protocol.
 */
contract AgentScoreRegistry is AccessControl, ERC721 {
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
        int256 scoreDelta;
        bytes data;
        uint256 timestamp;
    }

    /// @notice Mapping from agent ID to their profile data
    mapping(uint256 => AgentProfile) public agentProfiles;

    /// @notice Mapping from agent ID to their assertion history
    mapping(uint256 => Assertion[]) private _agentAssertions;

    /// @notice Mapping from agent ID to their historical score points over time
    mapping(uint256 => uint256[]) private _agentScoreHistory;

    /// @notice Mapping from token ID to their metadata URI
    mapping(uint256 => string) private _tokenURIs;

    /// @notice Mapping from agent address to their token ID
    mapping(address => uint256) public agentIds;

    /// @notice List of all registered agent IDs
    uint256[] public registeredAgents;

    /// @notice Counter for incremental token IDs
    uint256 private _nextTokenId = 0;

    /// @notice Event emitted when a new assertion is submitted
    event AssertionSubmitted(
        uint256 indexed tokenId,
        int256 scoreDelta,
        bytes data,
        uint256 timestamp
    );

    /// @notice Event emitted when a new agent registers
    event AgentRegistered(
        uint256 indexed tokenId,
        address indexed agent,
        string metadataURI
    );
    /// @notice Event emitted when an agent updates their profile
    event ProfileUpdated(uint256 indexed tokenId, string metadataURI);
    /// @notice Event emitted when an agent is blacklisted
    event AgentBlacklisted(uint256 indexed tokenId);
    /// @notice Event emitted when an agent is removed from the blacklist
    event AgentUnblacklisted(uint256 indexed tokenId);

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
    constructor(
        address admin,
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) {
        if (admin == address(0)) revert InvalidAdminAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /**
     * @notice Registers a new agent with metadata.
     * @param metadataURI The URI pointing to the agent's metadata (e.g., IPFS).
     */
    function registerAgent(string calldata metadataURI) external {
        if (agentIds[msg.sender] != 0) revert AgentAlreadyRegistered();

        uint256 tokenId = ++_nextTokenId;
        agentIds[msg.sender] = tokenId;

        AgentProfile storage profile = agentProfiles[tokenId];
        profile.isRegistered = true;
        profile.score = 50;
        profile.lastUpdated = block.timestamp;
        profile.assertionCount = 0;
        profile.isBlacklisted = false;

        // Initialize history with the starting score
        _agentScoreHistory[tokenId].push(50);

        registeredAgents.push(tokenId);

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit AgentRegistered(tokenId, msg.sender, metadataURI);
    }

    /**
     * @notice Updates the metadata URI for a registered agent.
     * @param metadataURI The new URI pointing to the agent's metadata.
     */
    function updateProfile(string calldata metadataURI) external {
        uint256 tokenId = agentIds[msg.sender];
        if (tokenId == 0) revert AgentNotRegistered();
        if (agentProfiles[tokenId].isBlacklisted) revert AgentIsBlacklisted();

        _setTokenURI(tokenId, metadataURI);
        emit ProfileUpdated(tokenId, metadataURI);
    }

    /**
     * @notice Sets the blacklist status for an agent.
     * @dev Only callable by the DEFAULT_ADMIN_ROLE.
     * @param tokenId The ID of the agent.
     * @param status True to blacklist, false to remove from blacklist.
     */
    function setBlacklistStatus(
        uint256 tokenId,
        bool status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        agentProfiles[tokenId].isBlacklisted = status;
        if (status) {
            emit AgentBlacklisted(tokenId);
        } else {
            emit AgentUnblacklisted(tokenId);
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
     * @notice Returns the list of all registered agent IDs.
     * @return An array of all registered agent IDs.
     */
    function getAllAgents() external view returns (uint256[] memory) {
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
    ) public view override(AccessControl, ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Sets the metadata URI for a given token ID.
     * @param tokenId The ID of the token.
     * @param uri The URI string.
     */
    function _setTokenURI(uint256 tokenId, string memory uri) internal virtual {
        _tokenURIs[tokenId] = uri;
    }

    /**
     * @notice Returns the metadata URI for a given token ID.
     * @param tokenId The ID of the token.
     */
    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    /**
     * @notice Submits an assertion for an agent, updating their score by a delta.
     * @dev Only callable by the CRE_ROLE. Score delta can be positive or negative.
     * @param tokenId The ID of the agent.
     * @param scoreDelta The change to apply to the reputation score.
     * @param data Additional data or proof associated with the assertion.
     */
    function submitAssertion(
        uint256 tokenId,
        int256 scoreDelta,
        bytes calldata data
    ) external onlyRole(CRE_ROLE) {
        AgentProfile storage profile = agentProfiles[tokenId];
        if (profile.isBlacklisted) revert AgentIsBlacklisted();

        // Apply delta and clamp between 0 and 100
        int256 newScore = int256(profile.score) + scoreDelta;
        if (newScore > 100) {
            profile.score = 100;
        } else if (newScore < 0) {
            profile.score = 0;
        } else {
            profile.score = uint256(newScore);
        }

        profile.lastUpdated = block.timestamp;
        profile.assertionCount++;

        _agentAssertions[tokenId].push(
            Assertion({
                scoreDelta: scoreDelta,
                data: data,
                timestamp: block.timestamp
            })
        );
        // Push the new score into the history log
        _agentScoreHistory[tokenId].push(profile.score);

        emit AssertionSubmitted(tokenId, scoreDelta, data, block.timestamp);
    }

    /**
     * @notice Returns the assertion history for a specific agent.
     * @param tokenId The ID of the agent.
     * @return An array of Assertion structs.
     */
    function getAgentHistory(
        uint256 tokenId
    ) external view returns (Assertion[] memory) {
        return _agentAssertions[tokenId];
    }

    /**
     * @notice Returns the score history for a specific agent.
     * @param tokenId The ID of the agent.
     * @param limit The maximum number of recent scores to return. Use 0 to return all.
     * @return An array of historical scores.
     */
    function getScoreHistory(
        uint256 tokenId,
        uint256 limit
    ) external view returns (uint256[] memory) {
        uint256[] storage fullHistory = _agentScoreHistory[tokenId];
        uint256 total = fullHistory.length;

        if (limit == 0 || limit >= total) {
            return fullHistory;
        }

        uint256[] memory recentHistory = new uint256[](limit);
        uint256 startIndex = total - limit;

        for (uint256 i = 0; i < limit; i++) {
            recentHistory[i] = fullHistory[startIndex + i];
        }

        return recentHistory;
    }
}
