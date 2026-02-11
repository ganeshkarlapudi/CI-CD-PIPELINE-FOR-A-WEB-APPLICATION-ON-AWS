# Aircraft Defect Detection System

A comprehensive AI-powered system for detecting and analyzing defects in aircraft components using machine learning and computer vision.

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.development

# Start the development environment
npm run dev
```

## 📚 Documentation

All documentation has been organized into the `docs/` folder for easy navigation:

**[📖 View Complete Documentation](./docs/README.md)**

### Quick Links

- **[Getting Started Guide](./docs/01-getting-started/)** - Setup and installation
- **[API Documentation](./docs/03-api-documentation/API_DOCUMENTATION.md)** - Complete API reference
- **[Dataflow & Architecture](./docs/08-ml-service/DATAFLOW_AND_TOKEN_RESOLUTION.md)** - System dataflow and token resolution
- **[Visual Diagrams](./docs/08-ml-service/DATAFLOW_DIAGRAMS.md)** - Architecture diagrams and quick reference
- **[Unified Sequence Diagram](./docs/08-ml-service/UNIFIED_SEQUENCE_DIAGRAM.md)** - Complete system flow in one diagram
- **[Unified ER Diagram](./docs/08-ml-service/UNIFIED_ER_DIAGRAM.md)** - Complete data model in one diagram
- **[Sequence & ER Diagrams](./docs/08-ml-service/SEQUENCE_AND_ER_DIAGRAMS.md)** - Individual diagrams and flowcharts
- **[Configuration Guide](./docs/02-configuration/ENV_SETUP_GUIDE.md)** - Environment setup
- **[Security Guide](./docs/04-security/SECURITY_IMPLEMENTATION.md)** - Security best practices
- **[Testing Guide](./docs/05-testing/INTEGRATION_TESTS_QUICK_START.md)** - Running tests
- **[Deployment Guide](./docs/06-deployment/DOCKER.md)** - Docker and deployment

## 🏗️ Project Structure

```
├── docs/                          # 📚 All documentation
│   ├── 01-getting-started/       # Setup and introduction
│   ├── 02-configuration/         # Configuration guides
│   ├── 03-api-documentation/     # API references
│   ├── 04-security/              # Security and error handling
│   ├── 05-testing/               # Testing guides
│   ├── 06-deployment/            # Deployment and Docker
│   └── 07-implementation-summaries/  # Feature implementations
├── src/                          # Backend source code
├── public/                       # Frontend files
├── ml-service/                   # Machine learning service
├── __tests__/                    # Test files
└── .kiro/                        # Kiro specs and configuration
```

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: HTML, CSS, JavaScript
- **ML Service**: Python, Flask, TensorFlow/PyTorch
- **Database**: MongoDB
- **Cache**: Redis
- **Containerization**: Docker

## 🔑 Key Features

- ✅ AI-powered defect detection
- ✅ User authentication and authorization
- ✅ Admin dashboard for system management
- ✅ Real-time monitoring and logging
- ✅ Trend analysis and reporting
- ✅ RESTful API with Swagger documentation
- ✅ Comprehensive error handling
- ✅ Redis caching for performance
- ✅ Docker support for easy deployment

## 🧪 Testing

```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

See the [Testing Guide](./docs/05-testing/INTEGRATION_TESTS_QUICK_START.md) for more details.

## 🐳 Docker

```bash
# Development environment
docker-compose -f docker-compose.dev.yml up

# Production environment
docker-compose up
```

See the [Docker Guide](./docs/06-deployment/DOCKER.md) for more details.

## 📝 License

[Add your license here]

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct.

## 📧 Contact

[Add contact information]

---

For detailed documentation, please visit the [docs folder](./docs/README.md).
