# Deployment Checklist

Use this checklist to ensure a successful deployment of the Aircraft Defect Detection System.

## Pre-Deployment

### System Requirements
- [ ] Docker Engine 20.10+ installed
- [ ] Docker Compose 2.0+ installed
- [ ] At least 4GB RAM available
- [ ] At least 10GB disk space available
- [ ] Ports 80, 3000, 5000, 6379, 27017 are available

### Configuration
- [ ] `.env` file created from `.env.example`
- [ ] `JWT_SECRET` set to a strong random string (32+ characters)
- [ ] `OPENAI_API_KEY` configured with valid API key
- [ ] `MONGO_ROOT_PASSWORD` changed from default
- [ ] `REDIS_PASSWORD` changed from default
- [ ] Storage configuration set (`USE_LOCAL_STORAGE` or AWS S3 credentials)
- [ ] All required environment variables reviewed

### Security
- [ ] Strong passwords set for all services
- [ ] JWT secret is unique and secure
- [ ] Default credentials changed
- [ ] `.env` file added to `.gitignore`
- [ ] Firewall rules configured (if production)
- [ ] SSL/TLS certificates prepared (if production)

## Deployment

### Build and Start
- [ ] Run `docker-compose build` successfully
- [ ] Run `docker-compose up -d` successfully
- [ ] All 5 containers started (frontend, backend, ml-service, mongodb, redis)
- [ ] Wait 30-60 seconds for services to initialize

### Health Checks
- [ ] Run `docker-compose ps` - all services show "Up" status
- [ ] Run `./health-check.sh` (Linux/Mac) - all checks pass
- [ ] Frontend accessible at http://localhost
- [ ] Backend API accessible at http://localhost:3000/api/health
- [ ] ML Service accessible at http://localhost:5000/health
- [ ] MongoDB container healthy
- [ ] Redis container healthy

### Functional Testing
- [ ] Can access login page at http://localhost/login.html
- [ ] Can register a new user account
- [ ] Can log in with created account
- [ ] User dashboard loads correctly
- [ ] Can access upload page
- [ ] Can upload a test image (JPEG/PNG)
- [ ] Image analysis completes successfully
- [ ] Results page displays with bounding boxes
- [ ] Can view inspection history
- [ ] Can export report (PDF/JSON)

### Admin Testing
- [ ] Can create admin user (via MongoDB or API)
- [ ] Can log in as admin
- [ ] Admin dashboard loads correctly
- [ ] Can access user management page
- [ ] Can access model management page
- [ ] Can access monitoring page
- [ ] System metrics display correctly

## Post-Deployment

### Monitoring Setup
- [ ] Check logs: `docker-compose logs -f`
- [ ] Verify no error messages in logs
- [ ] Monitor resource usage: `docker stats`
- [ ] Set up log rotation (if needed)
- [ ] Configure alerting (if production)

### Backup Configuration
- [ ] Test backup: `make backup`
- [ ] Verify backup files created in `backups/` directory
- [ ] Test restore: `make restore BACKUP_DATE=<date>`
- [ ] Schedule automated backups (if production)

### Performance Verification
- [ ] Image upload completes in < 5 seconds
- [ ] ML inference completes in < 10 seconds per image
- [ ] Dashboard loads in < 2 seconds
- [ ] API response times acceptable
- [ ] No memory leaks observed

### Documentation
- [ ] Team trained on system usage
- [ ] Admin procedures documented
- [ ] Backup/restore procedures documented
- [ ] Troubleshooting guide reviewed
- [ ] Contact information for support established

## Production-Specific

### Security Hardening
- [ ] HTTPS/SSL enabled with valid certificates
- [ ] Firewall configured (only ports 80/443 exposed)
- [ ] Rate limiting configured
- [ ] CORS settings restricted to allowed origins
- [ ] Security headers configured (helmet.js)
- [ ] Database access restricted to application only
- [ ] Redis password authentication enabled
- [ ] File upload validation enabled

### Scalability
- [ ] Resource limits configured in docker-compose.yml
- [ ] Auto-restart policies set
- [ ] Load balancer configured (if needed)
- [ ] CDN configured for static assets (if needed)
- [ ] Database replica set configured (if needed)
- [ ] Redis cluster configured (if needed)

### Monitoring & Logging
- [ ] Application monitoring tool integrated (e.g., Prometheus)
- [ ] Log aggregation configured (e.g., ELK stack)
- [ ] Error tracking configured (e.g., Sentry)
- [ ] Uptime monitoring configured
- [ ] Alert notifications configured
- [ ] Performance metrics dashboard created

### Compliance
- [ ] Data retention policies configured
- [ ] Privacy policy reviewed
- [ ] Terms of service reviewed
- [ ] GDPR compliance verified (if applicable)
- [ ] Data encryption at rest enabled
- [ ] Audit logging enabled

## Rollback Plan

### If Deployment Fails
1. [ ] Stop services: `docker-compose down`
2. [ ] Check logs: `docker-compose logs`
3. [ ] Review error messages
4. [ ] Fix configuration issues
5. [ ] Rebuild: `docker-compose build --no-cache`
6. [ ] Retry deployment

### If Issues Found After Deployment
1. [ ] Document the issue
2. [ ] Stop affected services: `docker-compose stop <service>`
3. [ ] Restore from backup if needed
4. [ ] Apply fixes
5. [ ] Test in development environment
6. [ ] Redeploy: `docker-compose up -d`

## Maintenance Schedule

### Daily
- [ ] Check service health
- [ ] Review error logs
- [ ] Monitor resource usage
- [ ] Verify backups completed

### Weekly
- [ ] Review system metrics
- [ ] Check disk space
- [ ] Review security logs
- [ ] Test backup restore

### Monthly
- [ ] Update Docker images
- [ ] Review and rotate logs
- [ ] Performance optimization review
- [ ] Security audit
- [ ] Update documentation

## Support Contacts

- **System Administrator**: _______________
- **DevOps Team**: _______________
- **ML Team**: _______________
- **Security Team**: _______________
- **Emergency Contact**: _______________

## Notes

Date Deployed: _______________
Deployed By: _______________
Version: _______________
Environment: [ ] Development [ ] Staging [ ] Production

Additional Notes:
_________________________________
_________________________________
_________________________________
