// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AgentScoreRegistry} from "../src/AgentScoreRegistry.sol";

contract DeployScript is Script {
    function run() public {
        // Load private key from .env file
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying AgentScoreRegistry with address:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Registry with deployer as admin
        AgentScoreRegistry registry = new AgentScoreRegistry(
            deployer,
            "AgentScoreIdentity",
            "ASI"
        );

        console.log("AgentScoreRegistry deployed at:", address(registry));

        vm.stopBroadcast();
    }
}
