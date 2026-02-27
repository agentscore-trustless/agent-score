// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
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
        uint256 score,
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

        // 2. Submit Assertion as CRE
        vm.startPrank(cre);
        uint256 score = 85;
        bytes memory data = hex"1234";

        vm.expectEmit(true, false, false, true);
        emit AssertionSubmitted(1, score, data, block.timestamp);

        registry.submitAssertion(1, score, data);

        (, , uint256 currentScore, , uint256 count) = registry.agentProfiles(1);
        assertEq(currentScore, score);
        assertEq(count, 1);
        vm.stopPrank();
    }

    function test_RevertIf_UnauthorizedSubmit() public {
        vm.prank(agent);
        registry.registerAgent("ipfs://QmTest");

        vm.prank(agent); // Agent tries to submit their own score

        // Expect AccessControl revert (generic check as selector depends on OZ version)
        vm.expectRevert();
        registry.submitAssertion(1, 100, "");
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
        registry.submitAssertion(1, 50, "");
        vm.stopPrank();
    }
}
