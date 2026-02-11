# Environment Setup Quick Guide

This guide helps you quickly set up environment variables for the Aircraft Defect Detection System.

## Quick Start

### 1. Choose Your Environment

```bash
# Local Development
cp .env.development .env

# Docker Deployment
cp .env.docker .env

# Production Deployment
cp .env.production .env
```

### 2. Required Configuration

Open `.env` and update these **required** variables:

```bash
# REQUIRED: OpenAI API Key
OPENAI_API_KEY=sk-your-actual-api-key-here

# REQUIRED: JWT Secret (generate with: openssl rand -base64 64)
JWT_SECRET=your-generated-secret-here

# REQUIRED: Session Secret (generate with: openssl rand -base64 64)
SESSION_SECRET=your-generated-secret-here
```

### 3. Start the Application

```bash
# Local Development
npm run dev

# Docker
docker-compose up -d

# Production
npm start
```

## Configuration Checklist

### Development Setup ✓

- [ ] Copy `.env.development` to `.env`
- [ ] Add your `OPENAI_API_KEY`
- [ ] (Optional) Generate new `JWT_SECRET`
- [ ] Ensure MongoDB is running locally
- [ ] Ensure Redis is running locally
- [ ] Start the application

### Docker Setup ✓

- [ ] Copy `.env.docker` to `.env`
- [ ] Add your `OPENAI_API_KEY`
- [ ] Generate new `JWT_SECRET` and `SESSION_SECRET`
- [ ] Run `docker-compose up -d`
- [ ] Check services with `docker-compose ps`

### Production Setup ✓

- [ ] Copy `.env.production` to `.env`
- [ ] Generate strong `JWT_SECRET` (64+ characters)
- [ ] Generate strong `SESSION_SECRET` (64+ characters)
- [ ] Update `MONGODB_URI` with production database
- [ ] Update `REDIS_URL` with production Redis
- [ ] Configure AWS S3 (set `USE_LOCAL_STORAGE=false`)
- [ ] Add production `OPENAI_API_KEY`
- [ ] Update `CORS_ALLOWED_ORIGINS` with your domain
- [ ] Update `APP_BASE_URL` with your domain
- [ ] Set `NODE_ENV=production`
- [ ] Review all security settings

## Generating Secrets

### JWT Secret
```bash
openssl rand -base64 64
```

### Session Secret
```bash
openssl rand -base64 64
```

### Random Password
```bash
openssl rand -base64 32
```

## Common Configurations

### Local Development with Local Services

```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/aircraft_detection
REDIS_URL=redis://localhost:6379
ML_SERVICE_URL=http://localhost:5000
USE_LOCAL_STORAGE=true
OPENAI_API_KEY=sk-your-key
```

### Docker Deployment

```bash
NODE_ENV=production
MONGODB_URI=mongodb://mongo:27017/aircraft_detection
REDIS_URL=redis://redis:6379
ML_SERVICE_URL=http://ml-service:5000
USE_LOCAL_STORAGE=true
OPENAI_API_KEY=sk-your-key
```

### Production with Cloud Services

```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aircraft_detection
REDIS_URL=redis://:password@redis-host:port
ML_SERVICE_URL=https://ml.yourdomain.com
USE_LOCAL_STORAGE=false
AWS_S3_BUCKET=aircraft-images-prod
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
OPENAI_API_KEY=sk-your-key
CORS_ALLOWED_ORIGINS=https://yourdomain.com
APP_BASE_URL=https://yourdomain.com
```

## Troubleshooting

### "OPENAI_API_KEY is required"
- Get your API key from https://platform.openai.com/api-keys
- Add it to your `.env` file: `OPENAI_API_KEY=sk-...`

### "JWT_SECRET must be set to a secure value"
- Generate a new secret: `openssl rand -base64 64`
- Update `.env`: `JWT_SECRET=<generated-secret>`

### "Cannot connect to MongoDB"
- Check MongoDB is running: `mongod --version`
- Verify connection string in `MONGODB_URI`
- For Docker: Use `mongodb://mongo:27017/aircraft_detection`
- For local: Use `mongodb://localhost:27017/aircraft_detection`

### "Cannot connect to Redis"
- Check Redis is running: `redis-cli ping`
- Verify connection string in `REDIS_URL`
- For Docker: Use `redis://redis:6379`
- For local: Use `redis://localhost:6379`

### "AWS S3 errors"
- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- Check bucket name in `AWS_S3_BUCKET`
- Ensure IAM user has S3 permissions
- Or use local storage: `USE_LOCAL_STORAGE=true`

### "CORS errors in browser"
- Add your frontend URL to `CORS_ALLOWED_ORIGINS`
- Example: `CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080`

## Environment Variables by Category

### Must Configure
- `OPENAI_API_KEY` - OpenAI API key
- `JWT_SECRET` - JWT signing secret
- `SESSION_SECRET` - Session secret
- `MONGODB_URI` - MongoDB connection

### Should Configure for Production
- `NODE_ENV` - Set to `production`
- `CORS_ALLOWED_ORIGINS` - Your domain(s)
- `APP_BASE_URL` - Your domain
- `USE_LOCAL_STORAGE` - Set to `false` for S3
- `AWS_S3_BUCKET` - S3 bucket name
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials

### Optional (Has Defaults)
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level (default: info)
- `RATE_LIMIT_MAX_REQUESTS` - Rate limit (default: 100)
- `MAX_FILE_SIZE` - Upload limit (default: 50MB)
- `YOLO_MODEL_PATH` - Model path (default: yolov8n.pt)

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use strong secrets** - Generate with `openssl rand -base64 64`
3. **Rotate secrets regularly** - Especially in production
4. **Use environment-specific configs** - Different secrets for dev/prod
5. **Restrict CORS** - Only allow trusted domains
6. **Enable rate limiting** - Protect against abuse
7. **Use HTTPS in production** - Secure all communications
8. **Monitor API usage** - Track OpenAI costs
9. **Use IAM roles** - Instead of hardcoded AWS credentials when possible
10. **Review logs** - Check for security issues

## Next Steps

After configuring your environment:

1. **Test the configuration**: Run `npm run dev` and check for errors
2. **Verify services**: Ensure MongoDB, Redis, and ML service are accessible
3. **Test API endpoints**: Use the test scripts in the project
4. **Check logs**: Review `./logs/` for any warnings or errors
5. **Monitor costs**: Track OpenAI API usage in the admin dashboard

## Additional Resources

- [Full Configuration Guide](CONFIGURATION.md) - Detailed documentation
- [README.md](README.md) - General project documentation
- [DOCKER.md](DOCKER.md) - Docker deployment guide
- [OpenAI API Docs](https://platform.openai.com/docs/)
- [MongoDB Connection Strings](https://docs.mongodb.com/manual/reference/connection-string/)
- [Redis Configuration](https://redis.io/topics/config)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review logs in `./logs/` directory
3. Verify all required variables are set
4. Check service connectivity (MongoDB, Redis, ML service)
5. Open an issue on GitHub with error details
