use std::f64;

#[derive(Debug, Clone)]
pub struct Vec3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Vec3 {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Vec3 { x, y, z }
    }

    pub fn dot(&self, other: &Vec3) -> f64 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    pub fn cross(&self, other: &Vec3) -> Vec3 {
        Vec3 {
            x: self.y * other.z - self.z * other.y,
            y: self.z * other.x - self.x * other.z,
            z: self.x * other.y - self.y * other.x,
        }
    }

    pub fn sub(&self, other: &Vec3) -> Vec3 {
        Vec3 {
            x: self.x - other.x,
            y: self.y - other.y,
            z: self.z - other.z,
        }
    }

    pub fn normalize(&self) -> Vec3 {
        let len = (self.x * self.x + self.y * self.y + self.z * self.z).sqrt();
        if len == 0.0 {
            Vec3::new(0.0, 0.0, 0.0)
        } else {
            Vec3::new(self.x / len, self.y / len, self.z / len)
        }
    }
}

#[derive(Debug, Clone)]
pub struct Aabb {
    pub min: Vec3,
    pub max: Vec3,
}

impl Aabb {
    pub fn from_triangle(tri: &Triangle) -> Self {
        let min = Vec3::new(
            tri.v0.x.min(tri.v1.x).min(tri.v2.x),
            tri.v0.y.min(tri.v1.y).min(tri.v2.y),
            tri.v0.z.min(tri.v1.z).min(tri.v2.z),
        );
        let max = Vec3::new(
            tri.v0.x.max(tri.v1.x).max(tri.v2.x),
            tri.v0.y.max(tri.v1.y).max(tri.v2.y),
            tri.v0.z.max(tri.v1.z).max(tri.v2.z),
        );
        Aabb { min, max }
    }

    pub fn merge(&self, other: &Aabb) -> Self {
        Aabb {
            min: Vec3::new(
                self.min.x.min(other.min.x),
                self.min.y.min(other.min.y),
                self.min.z.min(other.min.z),
            ),
            max: Vec3::new(
                self.max.x.max(other.max.x),
                self.max.y.max(other.max.y),
                self.max.z.max(other.max.z),
            ),
        }
    }

    pub fn intersect_ray(&self, orig: &Vec3, dir: &Vec3) -> bool {
        let inv_dx = if dir.x.abs() < 1e-9 { 1e9 } else { 1.0 / dir.x };
        let inv_dy = if dir.y.abs() < 1e-9 { 1e9 } else { 1.0 / dir.y };
        let inv_dz = if dir.z.abs() < 1e-9 { 1e9 } else { 1.0 / dir.z };

        let mut tmin = (self.min.x - orig.x) * inv_dx;
        let mut tmax = (self.max.x - orig.x) * inv_dx;
        if tmin > tmax { std::mem::swap(&mut tmin, &mut tmax); }

        let mut tymin = (self.min.y - orig.y) * inv_dy;
        let mut tymax = (self.max.y - orig.y) * inv_dy;
        if tymin > tymax { std::mem::swap(&mut tymin, &mut tymax); }

        if (tmin > tymax) || (tymin > tmax) { return false; }
        if tymin > tmin { tmin = tymin; }
        if tymax < tmax { tmax = tymax; }

        let mut tzmin = (self.min.z - orig.z) * inv_dz;
        let mut tzmax = (self.max.z - orig.z) * inv_dz;
        if tzmin > tzmax { std::mem::swap(&mut tzmin, &mut tzmax); }

        if (tmin > tzmax) || (tzmin > tmax) { return false; }

        true
    }
}

#[derive(Debug, Clone)]
pub struct Triangle {
    pub v0: Vec3,
    pub v1: Vec3,
    pub v2: Vec3,
}

impl Triangle {
    pub fn intersect(&self, orig: &Vec3, dir: &Vec3) -> bool {
        let edge1 = self.v1.sub(&self.v0);
        let edge2 = self.v2.sub(&self.v0);
        let h = dir.cross(&edge2);
        let a = edge1.dot(&h);

        if a.abs() < 1e-7 {
            return false;
        }

        let f = 1.0 / a;
        let s = orig.sub(&self.v0);
        let u = f * s.dot(&h);

        if u < 0.0 || u > 1.0 {
            return false;
        }

        let q = s.cross(&edge1);
        let v = f * dir.dot(&q);

        if v < 0.0 || u + v > 1.0 {
            return false;
        }

        let t = f * edge2.dot(&q);
        t > 1e-7
    }
}

#[derive(Debug, Clone)]
pub enum BvhNode {
    Leaf {
        bbox: Aabb,
        triangles: Vec<Triangle>,
    },
    Internal {
        bbox: Aabb,
        left: Box<BvhNode>,
        right: Box<BvhNode>,
    },
}

impl BvhNode {
    pub fn bbox(&self) -> &Aabb {
        match self {
            BvhNode::Leaf { bbox, .. } => bbox,
            BvhNode::Internal { bbox, .. } => bbox,
        }
    }

    pub fn build(mut triangles: Vec<Triangle>, depth: usize) -> Self {
        if triangles.is_empty() {
            let bbox = Aabb { min: Vec3::new(0.0, 0.0, 0.0), max: Vec3::new(0.0, 0.0, 0.0) };
            return BvhNode::Leaf { bbox, triangles: vec![] };
        }

        let mut bbox = Aabb::from_triangle(&triangles[0]);
        for tri in &triangles[1..] {
            bbox = bbox.merge(&Aabb::from_triangle(tri));
        }

        if triangles.len() <= 4 || depth >= 16 {
            return BvhNode::Leaf { bbox, triangles };
        }

        let axis = depth % 3;
        triangles.sort_by(|a, b| {
            let ca = match axis {
                0 => (a.v0.x + a.v1.x + a.v2.x) / 3.0,
                1 => (a.v0.y + a.v1.y + a.v2.y) / 3.0,
                _ => (a.v0.z + a.v1.z + a.v2.z) / 3.0,
            };
            let cb = match axis {
                0 => (b.v0.x + b.v1.x + b.v2.x) / 3.0,
                1 => (b.v0.y + b.v1.y + b.v2.y) / 3.0,
                _ => (b.v0.z + b.v1.z + b.v2.z) / 3.0,
            };
            ca.partial_cmp(&cb).unwrap_or(std::cmp::Ordering::Equal)
        });

        let mid = triangles.len() / 2;
        let right_tris = triangles.split_off(mid);

        let left = BvhNode::build(triangles, depth + 1);
        let right = BvhNode::build(right_tris, depth + 1);

        BvhNode::Internal {
            bbox,
            left: Box::new(left),
            right: Box::new(right),
        }
    }

    pub fn intersect_ray(&self, orig: &Vec3, dir: &Vec3) -> bool {
        if !self.bbox().intersect_ray(orig, dir) {
            return false;
        }

        match self {
            BvhNode::Leaf { triangles, .. } => {
                triangles.iter().any(|tri| tri.intersect(orig, dir))
            }
            BvhNode::Internal { left, right, .. } => {
                left.intersect_ray(orig, dir) || right.intersect_ray(orig, dir)
            }
        }
    }
}

#[derive(Debug, Clone)]
pub struct TriangleMesh {
    pub bvh: BvhNode,
}

impl TriangleMesh {
    pub fn new(triangles: Vec<Triangle>) -> Self {
        let bvh = BvhNode::build(triangles, 0);
        TriangleMesh { bvh }
    }
}

pub fn shading_factor(mesh: &TriangleMesh, target_points: &[Vec3], sun_dirs: &[Vec3]) -> Vec<f64> {
    if sun_dirs.is_empty() || target_points.is_empty() {
        return vec![];
    }

    sun_dirs
        .iter()
        .map(|sun_dir| {
            let dir_norm = sun_dir.normalize();
            let unshaded_count = target_points
                .iter()
                .filter(|pt| !mesh.bvh.intersect_ray(pt, &dir_norm))
                .count();

            unshaded_count as f64 / target_points.len() as f64
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bvh_shading_factor() {
        let obstacle = Triangle {
            v0: Vec3::new(-1.0, 1.0, 2.0),
            v1: Vec3::new(1.0, 1.0, 2.0),
            v2: Vec3::new(0.0, -1.0, 2.0),
        };
        let mesh = TriangleMesh::new(vec![obstacle]);
        let targets = vec![Vec3::new(0.0, 0.0, 0.0)];
        let sun_dirs = vec![Vec3::new(0.0, 0.0, 1.0)];

        let factors = shading_factor(&mesh, &targets, &sun_dirs);
        assert_eq!(factors.len(), 1);
        assert_eq!(factors[0], 0.0);
    }
}
