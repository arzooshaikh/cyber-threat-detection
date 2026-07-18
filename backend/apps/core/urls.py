from rest_framework.routers import DefaultRouter
from .views import (
    MilitaryBaseViewSet,
    NetworkTrafficViewSet,
    ThreatDetectionViewSet,
    FederatedModelRoundViewSet,
    ClientMetricsViewSet,
)

router = DefaultRouter()
router.register(r'bases', MilitaryBaseViewSet)
router.register(r'traffic', NetworkTrafficViewSet)
router.register(r'threats', ThreatDetectionViewSet)
router.register(r'fl-rounds', FederatedModelRoundViewSet)
router.register(r'client-metrics', ClientMetricsViewSet)

urlpatterns = router.urls