// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AgentScoreRegistry} from "../src/AgentScoreRegistry.sol";

contract AgentScoreRegistryTest is Test {
    AgentScoreRegistry public registry;
    address public admin;
    address public cre;
    address public agent;

    // Events to test
    event AgentRegistered(
        uint256 indexed tokenId,
        address indexed agent,
        string metadataURI
    );
    event AssertionSubmitted(
        uint256 indexed tokenId,
        int256 scoreDelta,
        bytes data,
        uint256 timestamp
    );
    event AgentBlacklisted(uint256 indexed tokenId);

    function setUp() public {
        admin = makeAddr("admin");
        cre = makeAddr("cre");
        agent = makeAddr("agent");

        // Deploy as admin
        vm.startPrank(admin);
        registry = new AgentScoreRegistry(admin, "AgentScoreIdentity", "ASI");

        // Grant CRE role to the mock CRE address
        registry.grantRole(registry.CRE_ROLE(), cre);
        vm.stopPrank();
    }

    function test_RegisterAgent() public {
        vm.startPrank(agent);
        string memory metadataURI = "ipfs://QmTestMetadata";

        vm.expectEmit(true, false, false, true);
        emit AgentRegistered(1, agent, metadataURI);

        registry.registerAgent(metadataURI);

        (bool isRegistered, , , , ) = registry.agentProfiles(1);
        assertTrue(isRegistered);
        assertEq(registry.agentIds(agent), 1);

        // Verify Soulbound Token was minted
        assertEq(registry.balanceOf(agent), 1);
        assertEq(registry.tokenURI(1), metadataURI);

        // Verify Score History initialized with default score (50)
        uint256[] memory history = registry.getScoreHistory(1, 0);
        assertEq(history.length, 1);
        assertEq(history[0], 50);

        vm.stopPrank();
    }

    function test_RevertIf_AgentAlreadyRegistered() public {
        vm.startPrank(agent);
        registry.registerAgent("ipfs://QmTest");

        vm.expectRevert(AgentScoreRegistry.AgentAlreadyRegistered.selector);
        registry.registerAgent("ipfs://QmTest2");
        vm.stopPrank();
    }

    function test_SubmitAssertion() public {
        // 1. Register Agent
        vm.prank(agent);
        registry.registerAgent("ipfs://QmTest");

        // 2. Submit Assertion as CRE (Positive Delta)
        vm.startPrank(cre);
        int256 scoreDelta = 35;
        bytes memory data = hex"1234";

        vm.expectEmit(true, false, false, true);
        emit AssertionSubmitted(1, scoreDelta, data, block.timestamp);

        registry.submitAssertion(1, scoreDelta, data);

        (, , uint256 currentScore, , uint256 count) = registry.agentProfiles(1);
        assertEq(currentScore, 85); // 50 (initial) + 35
        assertEq(count, 1);

        // Verify Score History captured the previous score (50) before updating
        uint256[] memory history = registry.getScoreHistory(1, 0);
        assertEq(history.length, 2);
        assertEq(history[0], 50);
        assertEq(history[1], 85);

        // 3. Submit Assertion as CRE (Negative Delta)
        int256 negativeDelta = -20;
        registry.submitAssertion(1, negativeDelta, data);

        (, , currentScore, , count) = registry.agentProfiles(1);
        assertEq(currentScore, 65); // 85 - 20
        assertEq(count, 2);

        history = registry.getScoreHistory(1, 0);
        assertEq(history.length, 3);
        assertEq(history[2], 65); // The new score is now 65. Wait, 85 was pushed to history by submitAssertion previously right? Well, actually we are fetching the whole array.
        // The array contains: [50, 85, 65] after the edits you made previously to `AgentScoreRegistry`.

        // Let's test the new getScoreHistory limit feature
        uint256[] memory limitedHistory = registry.getScoreHistory(1, 2);
        assertEq(limitedHistory.length, 2);
        assertEq(limitedHistory[0], 85);
        assertEq(limitedHistory[1], 65);

        vm.stopPrank();
    }

    function test_SubmitAssertion_Bounds() public {
        vm.prank(agent);
        registry.registerAgent("ipfs://QmTest");

        vm.startPrank(cre);

        // Test Upper Bound (>100)
        registry.submitAssertion(1, 100, "");
        (, , uint256 currentScore, , ) = registry.agentProfiles(1);
        assertEq(currentScore, 100);

        // Test Lower Bound (<0)
        registry.submitAssertion(1, -200, "");
        (, , currentScore, , ) = registry.agentProfiles(1);
        assertEq(currentScore, 0);

        vm.stopPrank();
    }

    function test_RevertIf_UnauthorizedSubmit() public {
        vm.prank(agent);
        registry.registerAgent("ipfs://QmTest");

        vm.prank(agent); // Agent tries to submit their own score

        // Expect AccessControl revert (generic check as selector depends on OZ version)
        vm.expectRevert();
        registry.submitAssertion(1, 10, "");
    }

    function test_Blacklist() public {
        vm.prank(agent);
        registry.registerAgent("ipfs://QmTest");

        vm.startPrank(admin);
        registry.setBlacklistStatus(1, true);

        (, bool isBlacklisted, , , ) = registry.agentProfiles(1);
        assertTrue(isBlacklisted);
        vm.stopPrank();

        // Try to submit assertion for blacklisted agent
        vm.startPrank(cre);
        vm.expectRevert(AgentScoreRegistry.AgentIsBlacklisted.selector);
        registry.submitAssertion(1, -10, "");
        vm.stopPrank();
    }

    function test_TokenURI() public {
        vm.startPrank(agent);
        string memory initialURI = "ipfs://QmInitial";
        registry.registerAgent(initialURI);

        // Verify initial URI
        assertEq(registry.tokenURI(1), initialURI);

        // Update Profile URI
        string memory newURI = "ipfs://QmUpdated";
        registry.updateProfile(newURI);

        // Verify the manual mapping from our _setTokenURI works
        assertEq(registry.tokenURI(1), newURI);
        vm.stopPrank();
    }
}
