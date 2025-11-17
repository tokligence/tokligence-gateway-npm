# Tokligence Gateway NPM Package Documentation

This directory contains design and implementation documentation for the npm package.

## Documents

### Chat Feature

- **[chat-feature-design.md](./chat-feature-design.md)** - High-level design of the `tgw chat` feature
  - Architecture overview
  - Detection priority
  - Environment variables
  - Knowledge base strategy
  - Function calling

- **[chat-implementation.md](./chat-implementation.md)** - Implementation guide for the `tgw chat` feature
  - File structure
  - Core components with full code
  - Documentation sync script
  - Implementation phases
  - Testing checklist

## Quick Links

### For Users

- [Main README](../README.md) - Package overview and installation
- [Quick Start](../QUICK_START_NPM.md) - Getting started guide
- [Chat Feature Design](./chat-feature-design.md) - How `tgw chat` works

### For Contributors

- [Chat Implementation Guide](./chat-implementation.md) - How to implement the chat feature
- [Publishing Guide](../PUBLISHING.md) - How to publish to npm
- [Version Management](../VERSION_MANAGEMENT.md) - Version management strategy

## Project Structure

```
tokligence-gateway-npm/
├── docs/                   # Design documentation (this folder)
├── lib/                    # Source code
│   ├── chat/              # Chat feature implementation
│   ├── knowledge/         # Documentation snapshot
│   └── index.js           # Main Gateway class
├── bin/                   # CLI executables
├── scripts/               # Build and sync scripts
├── test/                  # Test files
└── examples/              # Usage examples
```

## Development Status

### Completed Features

- ✅ Gateway management (`tgw init`, `start`, `stop`, `status`)
- ✅ Configuration management (`tgw config`)
- ✅ Binary management (auto-download)
- ✅ Logging (`tgw logs`)

### Planned Features

- 🚧 Chat assistant (`tgw chat`) - [See design docs](./chat-feature-design.md)
  - Phase 1: Infrastructure (In Progress)
  - Phase 2: LLM Integration (Planned)
  - Phase 3: CLI Integration (Planned)
  - Phase 4: Polish (Planned)

### Future Enhancements

- 📋 Plugin system
- 📋 Web UI
- 📋 Monitoring dashboard
- 📋 Performance analytics

## Contributing

See the [implementation guide](./chat-implementation.md) for how to contribute to the chat feature.

## License

MIT - See [LICENSE](../LICENSE) file
