// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IReceiver} from "./IReceiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ReceiverTemplate - Abstract receiver with optional permission controls
/// @notice Provides flexible, updatable security checks for receiving workflow reports
/// @dev The forwarder address is required at construction time for security.
abstract contract ReceiverTemplate is Ownable, IReceiver {
    // Required permission field at deployment, configurable after
    address private s_forwarderAddress; // If set, only this address can call onReport

    // Optional permission fields (all default to zero = disabled)
    address private s_expectedAuthor; // If set, only reports from this workflow owner are accepted
    bytes10 private s_expectedWorkflowName; // Only validated when s_expectedAuthor is also set
    bytes32 private s_expectedWorkflowId; // If set, only reports from this specific workflow ID are accepted

    // Hex character lookup table for bytes-to-hex conversion
    bytes private constant HEX_CHARS = "0123456789abcdef";

    // Custom errors
    error InvalidForwarderAddress();
    error InvalidSender(address sender, address expected);
    error InvalidAuthor(address received, address expected);
    error InvalidWorkflowName(bytes10 received, bytes10 expected);
    error InvalidWorkflowId(bytes32 received, bytes32 expected);
    error WorkflowNameRequiresAuthorValidation();

    // Events
    event ForwarderAddressUpdated(
        address indexed previousForwarder,
        address indexed newForwarder
    );
    event ExpectedAuthorUpdated(
        address indexed previousAuthor,
        address indexed newAuthor
    );
    event ExpectedWorkflowNameUpdated(
        bytes10 indexed previousName,
        bytes10 indexed newName
    );
    event ExpectedWorkflowIdUpdated(
        bytes32 indexed previousId,
        bytes32 indexed newId
    );
    event SecurityWarning(string message);

    /// @notice Constructor sets msg.sender as the owner and configures the forwarder address
    /// @param _forwarderAddress The address of the Chainlink Forwarder contract (cannot be address(0))
    constructor(address _forwarderAddress) Ownable(msg.sender) {
        if (_forwarderAddress == address(0)) {
            revert InvalidForwarderAddress();
        }
        s_forwarderAddress = _forwarderAddress;
        emit ForwarderAddressUpdated(address(0), _forwarderAddress);
    }

    /// @notice Returns the configured forwarder address
    function getForwarderAddress() external view returns (address) {
        return s_forwarderAddress;
    }

    /// @notice Returns the expected workflow author address
    function getExpectedAuthor() external view returns (address) {
        return s_expectedAuthor;
    }

    /// @notice Returns the expected workflow ID
    function getExpectedWorkflowId() external view returns (bytes32) {
        return s_expectedWorkflowId;
    }

    /// @inheritdoc IReceiver
    function onReport(
        bytes calldata metadata,
        bytes calldata report
    ) external override {
        // Security Check 1: Verify caller is the trusted Chainlink Forwarder (if configured)
        if (
            s_forwarderAddress != address(0) && msg.sender != s_forwarderAddress
        ) {
            revert InvalidSender(msg.sender, s_forwarderAddress);
        }

        // Security Checks 2-4: Verify workflow identity - ID, owner, and/or name (if any are configured)
        if (
            s_expectedWorkflowId != bytes32(0) ||
            s_expectedAuthor != address(0) ||
            s_expectedWorkflowName != bytes10(0)
        ) {
            (
                bytes32 workflowId,
                bytes10 workflowName,
                address workflowOwner
            ) = _decodeMetadata(metadata);

            if (
                s_expectedWorkflowId != bytes32(0) &&
                workflowId != s_expectedWorkflowId
            ) {
                revert InvalidWorkflowId(workflowId, s_expectedWorkflowId);
            }
            if (
                s_expectedAuthor != address(0) &&
                workflowOwner != s_expectedAuthor
            ) {
                revert InvalidAuthor(workflowOwner, s_expectedAuthor);
            }

            if (s_expectedWorkflowName != bytes10(0)) {
                if (s_expectedAuthor == address(0)) {
                    revert WorkflowNameRequiresAuthorValidation();
                }
                if (workflowName != s_expectedWorkflowName) {
                    revert InvalidWorkflowName(
                        workflowName,
                        s_expectedWorkflowName
                    );
                }
            }
        }

        _processReport(report);
    }

    /// @notice Updates the forwarder address that is allowed to call onReport
    function setForwarderAddress(address _forwarder) external onlyOwner {
        address previousForwarder = s_forwarderAddress;
        if (_forwarder == address(0)) {
            emit SecurityWarning(
                "Forwarder address set to zero - contract is now INSECURE"
            );
        }
        s_forwarderAddress = _forwarder;
        emit ForwarderAddressUpdated(previousForwarder, _forwarder);
    }

    /// @notice Updates the expected workflow owner address
    function setExpectedAuthor(address _author) external onlyOwner {
        address previousAuthor = s_expectedAuthor;
        s_expectedAuthor = _author;
        emit ExpectedAuthorUpdated(previousAuthor, _author);
    }

    /// @notice Updates the expected workflow ID
    function setExpectedWorkflowId(bytes32 _id) external onlyOwner {
        bytes32 previousId = s_expectedWorkflowId;
        s_expectedWorkflowId = _id;
        emit ExpectedWorkflowIdUpdated(previousId, _id);
    }

    function _decodeMetadata(
        bytes memory metadata
    )
        internal
        pure
        returns (
            bytes32 workflowId,
            bytes10 workflowName,
            address workflowOwner
        )
    {
        assembly {
            workflowId := mload(add(metadata, 32))
            workflowName := mload(add(metadata, 64))
            workflowOwner := shr(mul(12, 8), mload(add(metadata, 74)))
        }
        return (workflowId, workflowName, workflowOwner);
    }

    /// @notice Abstract function to process the report data
    function _processReport(bytes calldata report) internal virtual;

    /// @inheritdoc IERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return
            interfaceId == type(IReceiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}
